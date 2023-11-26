import minimist from "minimist";

/** The program's arguments. */
export interface Arguments {
  // file paths
  readonly inputFilePath: string;
  readonly outputFilePath: string;
  readonly unprocessedFilePath: string;
  readonly inputMetadataFilePath: string;
  // delimiters
  readonly inputDelimiter: string;
  readonly outputDelimiter: string;
  readonly delimiterReplacement: string;
  // columns, rows, cardinality
  readonly numberOfColumns?: number;
  readonly numberOfRows?: number;
  readonly maxCardinality: number;
  // encoding
  readonly inputFileEncoding: BufferEncoding;
  readonly outputFileEncoding: BufferEncoding;
}

interface ArgumentMetadataEntry {
  /** The argument's alias. */
  readonly alias: keyof Arguments;

  /** The argument's default value. */
  readonly default?: number | string;

  /** The argument's documentation. */
  readonly doc: string;

  /** The placeholder documentation value. */
  readonly placeholder: string;

  /** Indicates whether the argument is required. */
  readonly required?: boolean;

  /** The argument's type. */
  readonly type: "number" | "string";

  /** Validates the argument's value. */
  validate?(value: unknown): void;
}

type ArgumentMetadata = Record<string, ArgumentMetadataEntry>;

const ARGUMENT_METADATA_MAP: ArgumentMetadata = {
  // file paths
  input: {
    alias: "inputFilePath",
    doc: "The path to the input file to process.",
    placeholder: "filepath",
    required: true,
    type: "string",
  },
  output: {
    alias: "outputFilePath",
    doc: "The path to the output file to produce.",
    placeholder: "filepath",
    required: true,
    type: "string",
  },
  unprocessed: {
    alias: "unprocessedFilePath",
    default: "unprocessed.txt",
    doc: "The path to the file that contains unprocessed lines.",
    placeholder: "filepath",
    type: "string",
  },
  "input-metadata": {
    alias: "inputMetadataFilePath",
    default: "input-metadata.json",
    doc: "The path to the file that contains metadata about the input file.",
    placeholder: "filepath",
    type: "string",
  },
  // delimiters
  "input-delimiter": {
    alias: "inputDelimiter",
    default: "|",
    doc: "The input file value delimiter.",
    placeholder: "delimiter",
    type: "string",
  },
  "output-delimiter": {
    alias: "outputDelimiter",
    default: "\t",
    doc: "The output file value delimiter.",
    placeholder: "delimiter",
    type: "string",
  },
  "delimiter-replacement": {
    alias: "delimiterReplacement",
    default: " ",
    doc: "The value to replace input file delimiters when they're used in a string value.",
    placeholder: "replacement",
    type: "string",
  },
  // columns, rows, cardinality
  "number-of-columns": {
    alias: "numberOfColumns",
    doc: "The number of columns per row in the input file. It omitted, it's auto-detected from the first line.",
    placeholder: "number",
    type: "number",
  },
  "number-of-rows": {
    alias: "numberOfRows",
    doc: "The maximum number of rows to write to the output file. If omitted there's no limit.",
    placeholder: "number",
    type: "number",
  },
  "max-cardinality": {
    alias: "maxCardinality",
    default: 1000,
    doc: "The maximum number of unique values a column can have before it's considered unbounded.",
    placeholder: "number",
    type: "number",
  },
  // encoding
  "input-encoding": {
    alias: "inputFileEncoding",
    default: "utf8",
    doc: "The input file encoding.",
    placeholder: "encoding",
    type: "string",
    validate(value: BufferEncoding) {
      validateEncoding("input-encoding", value);
    },
  },
  "output-encoding": {
    alias: "outputFileEncoding",
    default: "utf8",
    doc: "The output file encoding.",
    placeholder: "encoding",
    type: "string",
    validate(value: BufferEncoding) {
      validateEncoding("input-encoding", value);
    },
  },
};

const ALLOWED_ENCODINGS = new Set<BufferEncoding>([
  "ascii",
  "latin1",
  "ucs2",
  "ucs-2",
  "utf8",
  "utf-8",
  "utf16le",
  "utf-16le",
]);

/** Parses the program's arguments. */
export function parse(argv: readonly string[]): ArgumentMetadata {
  const alias = Object.entries(ARGUMENT_METADATA_MAP).reduce<
    Record<string, string>
  >((obj, [name, { alias }]) => {
    obj[name] = alias;
    return obj;
  }, {});

  const def = Object.entries(ARGUMENT_METADATA_MAP).reduce<
    Record<string, unknown>
  >((obj, [name, { default: def }]) => {
    obj[name] = def;
    return obj;
  }, {});

  const string = Object.entries(ARGUMENT_METADATA_MAP)
    .filter(([, { type }]) => type === "string")
    .map(([name]) => name);

  /*
   * We remove the first two arguments, since they're always:
   * 1. The `node` binary.
   * 2. The entry module.
   */
  const parsedArgs: Record<string, unknown> = minimist(argv.slice(2), {
    alias,
    default: def,
    string,
    unknown(arg) {
      throw new Error(`Unknown argument: ${arg}`);
    },
  });

  for (const [name, { alias, required, type, validate }] of Object.entries(
    ARGUMENT_METADATA_MAP
  )) {
    const value = parsedArgs[name];

    if (value === undefined) {
      if (required) {
        throw new Error(`The argument --${name} is required.`);
      }
    } else if (type === "number" && typeof parsedArgs[alias] !== "number") {
      throw new Error(
        `Invalid value for --${name}. The value must be a number.`
      );
    } else if (validate) {
      validate(value);
    }
  }

  delete parsedArgs["_"];
  for (const name of Object.keys(ARGUMENT_METADATA_MAP)) {
    delete parsedArgs[name];
  }

  return parsedArgs as unknown as ArgumentMetadata;
}

/** Gets the help string. */
export function getHelp() {
  const argSummary = Object.entries(ARGUMENT_METADATA_MAP).map(
    ([name, { placeholder, required }]) => {
      let arg = `--${name} {${placeholder}}`;
      if (!required) {
        arg = "[" + arg + "]";
      }

      return arg;
    }
  );

  const argDetail = Object.entries(ARGUMENT_METADATA_MAP).map(
    ([name, { default: def, doc, type }]) => {
      let arg = `--${name}: ${doc}`;
      if (def) {
        arg += ` Defaults to: ${type === "string" ? `"${def}"` : def}`;
      }

      return arg;
    }
  );

  return (
    `usage: npm start ${argSummary.join(" ")}` +
    "\n\n" +
    "ARGUMENTS\n" +
    argDetail.join("\n")
  );
}

function validateEncoding(name: string, value: BufferEncoding): void {
  if (!ALLOWED_ENCODINGS.has(value)) {
    throw new Error(
      `Invalid encoding for argument --${name}. The following encodings are allowed: ${[
        ...ALLOWED_ENCODINGS,
      ]
        .map((x) => `"${x}"`)
        .join(", ")}`
    );
  }
}
