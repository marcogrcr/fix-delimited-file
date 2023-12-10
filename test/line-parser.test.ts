import { beforeEach, describe, expect, it } from "vitest";

import { FileMetadata } from "../src/file-metadata.js";
import { LineParser } from "../src/line-parser.js";
import { createColumnMetadata } from "./factories.js";

describe("LineParser", () => {
  describe("parse", () => {
    describe("bounded columns", () => {
      let parser: LineParser;
      beforeEach(() => {
        parser = new LineParser(
          "|",
          new FileMetadata([
            createColumnMetadata({
              unbounded: false,
              uniqueValues: ["col-1-val-1", "col-1-val-2", "col-1-val-3"],
            }),
            createColumnMetadata({
              unbounded: false,
              uniqueValues: ["col-2-val-1", "col-2-val-2", "col-2-val-3"],
            }),
            createColumnMetadata({
              unbounded: false,
              uniqueValues: ["col-3-val-1", "col-3-val-2", "col-3-val-3"],
            }),
          ])
        );
      });

      describe("exact column count", () => {
        it("returns parsed output", () => {
          const columns = ["col-1-val-1", "col-2-val-2", "col-3-val-3"];

          const actual = parser.parse(columns.join("|"));

          expect(actual).toStrictEqual({
            columns,
            unprocessedLines: [],
          });
        });
      });

      describe("higher column count", () => {
        it("returns no output", () => {
          const actual = parser.parse(
            ["col-1-val-1", "col-2-val-2", "col-3-val-3", "col-4-val-4"].join(
              "|"
            )
          );

          expect(actual).toStrictEqual({
            columns: null,
            unprocessedLines: [],
          });
        });
      });
    });

    describe("unbounded columns", () => {
      let parser: LineParser;
      beforeEach(() => {
        parser = new LineParser(
          "|",
          new FileMetadata([
            createColumnMetadata({ unbounded: true }),
            createColumnMetadata({ unbounded: true }),
            createColumnMetadata({ unbounded: true }),
          ])
        );
      });

      describe("exact column count", () => {
        it("returns parsed output", () => {
          const columns = ["val-1", "val-2", "val-3"];

          const actual = parser.parse(columns.join("|"));

          expect(actual).toStrictEqual({
            columns,
            unprocessedLines: [],
          });
        });
      });

      describe("higher column count", () => {
        it("merges last columns right", () => {
          const actual = parser.parse(
            ["val-1", "val-2", "val-3", "val-4", "val-5"].join("|")
          );

          expect(actual).toStrictEqual({
            columns: ["val-1", "val-2", "val-3 val-4 val-5"],
            unprocessedLines: [],
          });
        });
      });
    });

    describe("mixed columns", () => {
      let parser: LineParser;
      beforeEach(() => {
        parser = new LineParser(
          "|",
          new FileMetadata([
            createColumnMetadata({ unbounded: true }),
            createColumnMetadata({ unbounded: true }),
            createColumnMetadata({
              unbounded: false,
              uniqueValues: ["col-3-val-1", "col-3-val-2", "col-3-val-3"],
            }),
            createColumnMetadata({ unbounded: true }),
            createColumnMetadata({ unbounded: true }),
          ])
        );
      });

      describe("higher column count", () => {
        it("merges columns before each anchor right", () => {
          const actual = parser.parse(
            [
              "val-1",
              "val-2",
              "val-3",
              "val-4",
              "col-3-val-1",
              "val-5",
              "val-6",
              "val-7",
              "val-8",
            ].join("|")
          );

          expect(actual).toStrictEqual({
            columns: [
              "val-1",
              "val-2 val-3 val-4",
              "col-3-val-1",
              "val-5",
              "val-6 val-7 val-8",
            ],
            unprocessedLines: [],
          });
        });
      });

      describe("lower column count", () => {
        it("merges and parses lines", () => {
          const first = parser.parse(["val-1", "val-2", "val-3"].join("|"));
          const second = parser.parse(["col-3-val-1", "val-4"].join("|"));
          const third = parser.parse(["val-5", "val-6"].join("|"));

          expect(first).toStrictEqual({
            columns: null,
            unprocessedLines: [],
          });
          expect(second).toStrictEqual({
            columns: null,
            unprocessedLines: [],
          });
          expect(third).toStrictEqual({
            columns: [
              "val-1",
              "val-2 val-3",
              "col-3-val-1",
              "val-4",
              "val-5 val-6",
            ],
            unprocessedLines: [],
          });
        });

        describe("subsequent line matches exactly", () => {
          it("discards previous lines", () => {
            const firstLine = ["val-1", "val-2", "val-3"].join("|");
            const secondLine = ["val-4", "val-5"].join("|");

            const first = parser.parse(firstLine);
            const second = parser.parse(secondLine);
            const third = parser.parse(
              ["val-6", "val-7", "col-3-val-1", "val-8", "val-9"].join("|")
            );

            expect(first).toStrictEqual({
              columns: null,
              unprocessedLines: [],
            });
            expect(second).toStrictEqual({
              columns: null,
              unprocessedLines: [],
            });
            expect(third).toStrictEqual({
              columns: ["val-6", "val-7", "col-3-val-1", "val-8", "val-9"],
              unprocessedLines: [firstLine, secondLine],
            });
          });
        });

        describe("subsequent lines match partially", () => {
          it("discards previous lines", () => {
            parser = new LineParser(
              "|",
              new FileMetadata([
                createColumnMetadata({
                  unbounded: false,
                  uniqueValues: ["col-1-val-1", "col-1-val-2", "col-1-val-3"],
                }),
                createColumnMetadata({
                  unbounded: false,
                  uniqueValues: ["col-2-val-1", "col-2-val-2", "col-2-val-3"],
                }),
                createColumnMetadata({ unbounded: true }),
              ])
            );
            const firstLine = ["val-1", "val-2"].join("|");
            const secondLine = ["col-1-val-1", "val-3"].join("|");

            const first = parser.parse(firstLine);
            const second = parser.parse(secondLine);
            const third = parser.parse(
              ["col-1-val-1", "col-2-val-1"].join("|")
            );
            const fourth = parser.parse(["val-4", "val-5"].join("|"));

            expect(first).toStrictEqual({
              columns: null,
              unprocessedLines: [],
            });
            expect(second).toStrictEqual({
              columns: null,
              unprocessedLines: [],
            });
            expect(third).toStrictEqual({
              columns: null,
              unprocessedLines: [],
            });
            expect(fourth).toStrictEqual({
              columns: ["col-1-val-1", "col-2-val-1", "val-4 val-5"],
              unprocessedLines: [firstLine, secondLine],
            });
          });
        });
      });
    });
  });
});
