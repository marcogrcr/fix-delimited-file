import { describe, expect, it } from "vitest";

import { Arguments, getHelp, parse } from "../src/args.js";

describe("args", () => {
  describe("getHelp", () => {
    it("returns help string", () => {
      const actual = getHelp();

      expect(actual).toBe(
        "usage: npm start " +
          "--input {filepath} " +
          "--output {filepath} " +
          "[--unprocessed {filepath}] " +
          "[--input-metadata {filepath}] " +
          "[--input-delimiter {delimiter}] " +
          "[--output-delimiter {delimiter}] " +
          "[--delimiter-replacement {replacement}] " +
          "[--number-of-columns {number}] " +
          "[--number-of-rows {number}] " +
          "[--max-cardinality {number}] " +
          "[--input-encoding {encoding}] " +
          "[--output-encoding {encoding}]\n\n" +
          "ARGUMENTS\n" +
          "--input: The path to the input file to process.\n" +
          "--output: The path to the output file to produce.\n" +
          '--unprocessed: The path to the file that contains unprocessed lines. Defaults to: "unprocessed.txt"\n' +
          '--input-metadata: The path to the file that contains metadata about the input file. Defaults to: "input-metadata.json"\n' +
          '--input-delimiter: The input file value delimiter. Defaults to: "|"\n' +
          '--output-delimiter: The output file value delimiter. Defaults to: "\t"\n' +
          '--delimiter-replacement: The value to replace input file delimiters when they\'re used in a string value. Defaults to: " "\n' +
          "--number-of-columns: The number of columns per row in the input file. It omitted, it's auto-detected from the first line.\n" +
          "--number-of-rows: The maximum number of rows to write to the output file. If omitted there's no limit.\n" +
          "--max-cardinality: The maximum number of unique values a column can have before it's considered unbounded. Defaults to: 1000\n" +
          '--input-encoding: The input file encoding. Defaults to: "utf8"\n' +
          '--output-encoding: The output file encoding. Defaults to: "utf8"'
      );
    });
  });

  describe("parse", () => {
    const minArgs = [
      "node",
      "entry-module",
      "--input",
      "input",
      "--output",
      "output",
    ];

    [
      ["node", "entry-module", "--input", "input"],
      ["node", "entry-module", "--output", "output"],
    ].forEach((argv) => {
      describe(`missing ${argv[2]}`, () => {
        it("throws error", () => {
          expect(() => parse(argv)).toThrowError(/argument.+is required/i);
        });
      });
    });

    ["--number-of-columns", "--number-of-rows", "--max-cardinality"].forEach(
      (arg) => {
        describe(`${arg} is not number`, () => {
          it("throws error", () => {
            expect(() => parse([...minArgs, arg, "value"])).toThrowError(
              /must be a number/i
            );
          });
        });
      }
    );

    describe("unknown argument", () => {
      it("throws error", () => {
        expect(() => parse([...minArgs, "--other"])).toThrowError(
          /unknown argument: --other/i
        );
      });
    });

    ["--input-encoding", "--output-encoding"].forEach((arg) => {
      describe(`${arg} has invalid encoding`, () => {
        it("throws error", () => {
          expect(() => parse([...minArgs, arg, "invalid"])).toThrowError(
            /invalid encoding/i
          );
        });
      });
    });

    describe("minimum arguments", () => {
      it("returns arguments with defaults", () => {
        const expected: Arguments = {
          inputFilePath: "input",
          outputFilePath: "output",
          unprocessedFilePath: "unprocessed.txt",
          inputMetadataFilePath: "input-metadata.json",
          inputDelimiter: "|",
          outputDelimiter: "\t",
          delimiterReplacement: " ",
          maxCardinality: 1000,
          inputFileEncoding: "utf8",
          outputFileEncoding: "utf8",
        };

        const actual = parse(minArgs);

        expect(actual).toEqual(expected);
      });
    });

    describe("all arguments", () => {
      it("returns all arguments", () => {
        const expected: Arguments = {
          inputFilePath: "input",
          outputFilePath: "output",
          unprocessedFilePath: "unprocessed",
          inputMetadataFilePath: "input-metadata",
          inputDelimiter: "input-del",
          outputDelimiter: "output-del",
          delimiterReplacement: "del-replacement",
          numberOfColumns: 1,
          numberOfRows: 2,
          maxCardinality: 3,
          inputFileEncoding: "latin1",
          outputFileEncoding: "ucs2",
        };

        const actual = parse([
          ...minArgs,
          "--unprocessed",
          "unprocessed",
          "--input-metadata",
          "input-metadata",
          "--input-delimiter",
          "input-del",
          "--output-delimiter",
          "output-del",
          "--delimiter-replacement",
          "del-replacement",
          "--number-of-columns",
          "1",
          "--number-of-rows",
          "2",
          "--max-cardinality",
          "3",
          "--input-encoding",
          "latin1",
          "--output-encoding",
          "ucs2"
        ]);

        expect(actual).toEqual(expected);
      });
    });
  });
});
