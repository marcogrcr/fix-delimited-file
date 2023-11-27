import { readFile, writeFile } from "node:fs/promises";

import { GetFileLinesInput, getFileLines } from "./file-utils.js";

export interface CreateInput extends GetFileLinesInput {
  /** The column delimiter. */
  readonly delimiter: string;
  /** The file path to the cache of the metadata. */
  readonly metadataFilePath?: string;
  /** The maximum number of unique values a column can have before it's considered unbounded. */
  readonly maxCardinality: number;
  /** The number of columns per row in the file. It omitted, it's auto-detected from the first line. */
  readonly numberOfColumns?: number;
}

/** Contains the metadata of a delimited file. */
export class FileMetadata {
  readonly #columns: ColumnMetadata[];

  private constructor(columns: ColumnMetadata[]) {
    this.#columns = columns;
  }

  /** The columns' metadata. */
  get columns(): readonly ColumnMetadata[] {
    return this.#columns;
  }

  /** Create a new instance of {@link FileMetadata}. */
  static async create(input: CreateInput): Promise<FileMetadata> {
    const {
      delimiter,
      encoding,
      filePath,
      maxCardinality,
      metadataFilePath,
      numberOfColumns,
    } = input;

    // attempt to get the result from the cache
    const cachedResult =
      metadataFilePath && (await FileMetadata.#getCache(metadataFilePath));
    if (cachedResult) {
      return cachedResult;
    }

    // if number of columns specified, initialize columns
    let columns: ColumnMetadata[] | undefined;
    if (numberOfColumns) {
      columns = [];
      for (let i = 1; i <= numberOfColumns; ++i) {
        columns.push(new ColumnMetadata(`col_${i}`));
      }
    }

    for await (const line of getFileLines({ encoding, filePath })) {
      const colData = line.split(delimiter);

      // if number of columns not specified, get them from first line
      if (!columns) {
        columns = [];
        for (const col of colData) {
          columns.push(new ColumnMetadata(col));
        }
      } else if (colData.length === columns.length) {
        // only process if line contains expected number of columns
        for (let i = 0; i < columns.length; ++i) {
          columns[i].add(colData[i], maxCardinality);
        }
      }
    }

    // set cache
    const result = new FileMetadata(columns ?? []);
    if (metadataFilePath) {
      await FileMetadata.#setCache(metadataFilePath, result);
    }

    return result;
  }

  /** Invoked by {@link JSON.stringify}. */
  toJSON(): Record<string, unknown> {
    return {
      columns: this.columns.map(x => x.toJSON()),
    };
  }

  static #fromJson(obj: Record<string, unknown>): FileMetadata {
    if (!Array.isArray(obj.columns)) {
      missingOrInvalidField("columns");
    }

    return new FileMetadata(obj.columns.map((x) => ColumnMetadata.fromJson(x)));
  }

  static async #getCache(filePath: string): Promise<FileMetadata | null> {
    try {
      const buffer = await readFile(filePath);
      const obj = JSON.parse(buffer.toString());
      return FileMetadata.#fromJson(obj);
    } catch (e) {
      // if file is not found, return null
      if (
        e instanceof Error &&
        (e as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return null;
      }

      // else rethrow error
      throw e;
    }
  }

  static async #setCache(
    filePath: string,
    metadata: FileMetadata
  ): Promise<void> {
    await writeFile(filePath, JSON.stringify(metadata.toJSON(), null, 2));
  }
}

/** Contains the metadata of a delimited file column. */
export class ColumnMetadata {
  #maxLength = 0;
  #name = "";
  #unbounded = false;
  #uniqueValues = new Set<string>();

  /**
   * Creates a new instance of the {@link ColumnMetadata} class.
   * @param name The column name.
   */
  constructor(name: string) {
    this.#name = name;
  }

  /** The column's cardinality. */
  get cardinality(): number | null {
    return this.#unbounded ? null : this.#uniqueValues.size;
  }

  /** The maximum length of the column. */
  get maxLength(): number {
    return this.#maxLength;
  }

  /** The column's name. */
  get name(): string {
    return this.#name;
  }

  /** Whether the column is unbounded. */
  get unbounded(): boolean {
    return this.#unbounded;
  }

  /** The unique values present in the column. */
  get uniqueValues(): ReadonlySet<string> {
    return this.#uniqueValues;
  }

  /** Creates a new instance of the {@link ColumnMetadata} class from JSON object. */
  static fromJson(obj: Record<string, unknown>): ColumnMetadata {
    if (typeof obj.maxLength !== "number") {
      missingOrInvalidField("maxLength");
    }

    if (typeof obj.name !== "string") {
      missingOrInvalidField("name");
    }

    if (typeof obj.unbounded !== "boolean") {
      missingOrInvalidField("unbounded");
    }

    if (
      !Array.isArray(obj.uniqueValues) ||
      obj.uniqueValues.some((x) => typeof x !== "string")
    ) {
      missingOrInvalidField("uniqueValues");
    }

    const result = new ColumnMetadata(obj.name);
    result.#maxLength = obj.maxLength;
    result.#unbounded = obj.unbounded;
    result.#uniqueValues = new Set(obj.uniqueValues);

    return result;
  }

  /**
   * Processess a new value.
   * @param value The value to process.
   * @param maxCardinality The maximum number of unique values a column can have before it's considered unbounded.
   */
  add(value: string, maxCardinality: number): ColumnMetadata {
    if (this.#maxLength < value.length) {
      this.#maxLength = value.length;
    }

    if (!this.#unbounded) {
      this.#uniqueValues.add(value);
      if (this.#uniqueValues.size > maxCardinality) {
        this.#unbounded = true;
        this.#uniqueValues.clear();
      }
    }

    return this;
  }

  /** Invoked by {@link JSON.stringify}. */
  toJSON(): Record<string, unknown> {
    return {
      cardinality: this.cardinality,
      maxLength: this.maxLength,
      name: this.name,
      unbounded: this.unbounded,
      uniqueValues: [...this.uniqueValues],
    };
  }
}

function missingOrInvalidField(field: string): never {
  throw new Error(`Missing or invalid type for field: ${field}.`);
}
