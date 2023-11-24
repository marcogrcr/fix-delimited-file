import { describe, expect, it } from "vitest";
import { basename } from "node:path";

import { getFileLines } from "../src/file-utils.js";
import { LATIN_1, NO_NEW_LINE, THREE_LINES } from "./test-files/index.js";

describe("file-utils", () => {
  describe("getFileLines", () => {
    describe(`file: ${basename(THREE_LINES)}`, () => {
      it("yields each line one by one", async () => {
        const actual: string[] = [];
        for await (const line of getFileLines({
          filePath: THREE_LINES,
        })) {
          actual.push(line);
          actual.push(".");
        }

        expect(actual).toEqual(["line 1", ".", "line 2", ".", "line 3", "."]);
      });
    });

    describe(`file: ${basename(NO_NEW_LINE)}`, () => {
      it("yields all lines", async () => {
        const actual: string[] = [];
        for await (const line of getFileLines({
          filePath: NO_NEW_LINE,
        })) {
          actual.push(line);
        }

        expect(actual).toEqual(["begin", "end"]);
      });
    });

    describe(`file: ${basename(LATIN_1)}`, () => {
      it("yields line with correct encoding", async () => {
        const actual: string[] = [];
        for await (const line of getFileLines({
          encoding: "latin1",
          filePath: LATIN_1,
        })) {
          actual.push(line);
        }

        expect(actual).toEqual(["English", "Español"]);
      });
    });
  });
});
