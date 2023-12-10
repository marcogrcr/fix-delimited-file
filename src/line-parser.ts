import type { FileMetadata } from "./file-metadata.js";

interface ParseOutput {
  /**
   * The parsed columns if the specified line was parsed successfully.
   * `null` otherwise.
   */
  readonly columns: readonly string[] | null;

  /**
   * Contains any unprocessed lines after a successful parsing.
   */
  readonly unprocessedLines: readonly string[];
}

export class LineParser {
  readonly #delimiter: string;
  readonly #mergeSeparator: string;
  readonly #metadata: FileMetadata;

  #lines: string[] = [];

  /**
   * Creates a new instance of the {@link LineParser} class.
   * @param delimiter The column delimiter character.
   * @param metadata The {@link FileMetadata} to use for parsing text lines.
   * @param mergeSeparator The character to use in-between merged columns.
   */
  constructor(delimiter: string, metadata: FileMetadata, mergeSeparator = " ") {
    this.#delimiter = delimiter;
    this.#mergeSeparator = mergeSeparator;
    this.#metadata = metadata;
  }

  /**
   * Tries to parse a line according to the {@link FileMetadata} specified in the constructor. If parsing fails, the
   * previously attempted lines are kept in-memory and merged in an attempt to succeed parsing. When parsing succeeds
   * any previously kept lines that were not used are returned as unprocessed.
   * @param line The line to attempt to parse.
   */
  parse(line: string): ParseOutput {
    // try to parse `line`
    const cols = line.split(this.#delimiter);
    const columns = this.#tryParseColumns(cols);

    // if parsing succeeds, discard any previous lines
    if (columns != null) {
      const unprocessedLines = this.#lines;
      this.#lines = [];
      return {
        columns,
        unprocessedLines,
      };
    }

    // add `line` to cache
    this.#lines.push(line);

    // if there's more than one line
    if (this.#lines.length > 1) {
      for (let skipCount = 0; skipCount < this.#lines.length; ++skipCount) {
        // merge the lines and try to parse them
        const cols = this.#lines
          .slice(skipCount)
          .flatMap((x) => x.split(this.#delimiter));
        const columns = this.#tryParseColumns(cols);

        // if parsing succeeds, let unprocessed lines be the skipped lines
        if (columns != null) {
          const unprocessedLines = this.#lines.slice(0, skipCount);
          this.#lines = [];
          return {
            columns,
            unprocessedLines,
          };
        }
      }
    }

    // otherwise, return indicating that we couldn't parse any data
    return {
      columns: null,
      unprocessedLines: [],
    };
  }

  #tryParseColumns(cols: readonly string[]): readonly string[] | null {
    const { anchorColumns, columns } = this.#metadata;
    const result: string[] = [];

    // if there are not enough columns for parsing
    if (cols.length < columns.length) {
      return null;
    }

    // for each anchor column
    let colIndex = 0;
    for (const anchor of anchorColumns) {
      // if we've run out of columns, return `null`
      if (colIndex + anchor.previousColumns > cols.length) {
        return null;
      }

      // advance and store the previous columns
      for (let i = 0; i < anchor.previousColumns; ++i) {
        result.push(cols[colIndex++]);
      }

      if (anchor.metadata) {
        // advance until the anchor column matches
        let extraColIndex = 0;
        while (
          !anchor.metadata.unbounded &&
          !anchor.metadata.uniqueValues.has(cols[colIndex + extraColIndex])
        ) {
          // if we've run out of columns, return `null`
          if (++extraColIndex + colIndex >= cols.length) {
            return null;
          }
        }

        // if there's extra columns and no previous columns, return `null`
        if (extraColIndex > 0 && anchor.previousColumns === 0) {
          return null;
        }

        // append the extra columns to the latest column
        for (let i = 0; i < extraColIndex; ++i) {
          result[result.length - 1] +=
            this.#mergeSeparator + cols[colIndex + i];
        }

        // append the anchor column value
        result[colIndex] = cols[colIndex + extraColIndex];

        // advance the column index
        colIndex += extraColIndex + 1;
      } else {
        // invisible anchor: merge all remaining columns
        while (colIndex < cols.length) {
          result[result.length - 1] += this.#mergeSeparator + cols[colIndex++];
        }
      }
    }

    // if we didn't consume all the columns, return `null`
    if (colIndex < cols.length) {
      return null;
    }

    return result;
  }
}
