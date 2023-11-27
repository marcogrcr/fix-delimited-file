import { rm } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ColumnMetadata,
  CreateInput,
  FileMetadata,
} from "../src/file-metadata.js";
import { STAR_WARS_CHARACTERS } from "./test-files/index.js";
import * as fileUtils from "../src/file-utils.js";

vi.mock("../src/file-utils.js");
const getFileLinesMock = vi.mocked(fileUtils.getFileLines);

describe("file-metadata", () => {
  const cacheFilePath = ".file-metadata.test.json";

  afterAll(async () => {
    await tryDeleteFile(cacheFilePath);
  });

  describe("ColumnMetadata", () => {
    describe("fromJSON", () => {
      const validObj = {
        maxLength: 6,
        name: "col",
        unbounded: false,
        uniqueValues: ["value1", "value2"],
      } as const;

      it("returns ColumnMetadata instance", () => {
        const actual = ColumnMetadata.fromJson(validObj);

        expect(actual.cardinality).toBe(2);
        expect(actual.maxLength).toBe(6);
        expect(actual.name).toBe("col");
        expect(actual.unbounded).toBe(false);
        expect(actual.uniqueValues).toStrictEqual(
          new Set(["value1", "value2"])
        );
      });

      const missingFieldTestCases: readonly (keyof typeof validObj)[] = [
        "maxLength",
        "name",
        "unbounded",
        "uniqueValues",
      ];
      missingFieldTestCases.forEach((field) => {
        describe(`missing '${field}' field`, () => {
          it("throws error", () => {
            const obj = { ...validObj };
            delete obj[field];
            expect(() => ColumnMetadata.fromJson(obj)).toThrowError(
              new RegExp(`missing.+${field}`, "i")
            );
          });
        });

        describe(`invalid type on '${field}' field`, () => {
          it("throws error", () => {
            const obj: Record<string, unknown> = { ...validObj };
            obj[field] = [1, 2, 3];
            expect(() => ColumnMetadata.fromJson(obj)).toThrowError(
              new RegExp(`missing.+${field}`, "i")
            );
          });
        });
      });
    });

    describe("toJSON", () => {
      it("serializes object successfully", () => {
        const maxCardinality = 2;
        const col = new ColumnMetadata("col");
        col
          .add("value1", maxCardinality)
          .add("value2", maxCardinality)
          .add("value2", maxCardinality);

        const actual = JSON.stringify(col);

        const expected = JSON.stringify({
          cardinality: 2,
          maxLength: 6,
          name: "col",
          unbounded: false,
          uniqueValues: ["value1", "value2"],
        });
        expect(actual).toEqual(expected);
      });
    });

    describe("exceed max cardinality", () => {
      it("clears unique values, set to unbounded", () => {
        const maxCardinality = 3;
        const col = new ColumnMetadata("col");
        col
          .add("1", maxCardinality)
          .add("2", maxCardinality)
          .add("3", maxCardinality)
          .add("4", maxCardinality);

        expect(col.cardinality).toBeNull();
        expect(col.unbounded).toBe(true);
        expect(col.uniqueValues.size).toBe(0);
      });
    });
  });

  describe("FileMetadata", () => {
    describe("create", () => {
      beforeEach(async () => {
        const { getFileLines } = (await vi.importActual(
          "../src/file-utils.js"
        )) as typeof fileUtils;
        getFileLinesMock.mockImplementation(getFileLines);
      });

      describe("auto-detect columns from first line", () => {
        it("computes correct file metadata", async () => {
          const actual = await FileMetadata.create({
            delimiter: "|",
            filePath: STAR_WARS_CHARACTERS,
            maxCardinality: 2,
          });

          expect(actual.columns.length).toBe(2);
          const [nameCol, forceAlignCol] = actual.columns;
          expect(nameCol.cardinality).toBeNull();
          expect(nameCol.maxLength).toBe(14);
          expect(nameCol.name).toBe("name");
          expect(nameCol.unbounded).toBe(true);
          expect(nameCol.uniqueValues.size).toBe(0);
          expect(forceAlignCol.cardinality).toBe(2);
          expect(forceAlignCol.maxLength).toBe(5);
          expect(forceAlignCol.name).toBe("force_alignment");
          expect(forceAlignCol.unbounded).toBe(false);
          expect(forceAlignCol.uniqueValues).toStrictEqual(
            new Set(["Dark", "Light"])
          );
        });
      });

      describe("explicit number of columns", () => {
        it("considers first line as part of data", async () => {
          const actual = await FileMetadata.create({
            delimiter: "|",
            filePath: STAR_WARS_CHARACTERS,
            maxCardinality: 3,
            numberOfColumns: 2,
          });

          expect(actual.columns.length).toBe(2);
          const [nameCol, forceAlignCol] = actual.columns;
          expect(nameCol.cardinality).toBeNull();
          expect(nameCol.maxLength).toBe(14);
          expect(nameCol.name).toBe("col_1");
          expect(nameCol.unbounded).toBe(true);
          expect(nameCol.uniqueValues.size).toBe(0);
          expect(forceAlignCol.cardinality).toBe(3);
          expect(forceAlignCol.maxLength).toBe(15);
          expect(forceAlignCol.name).toBe("col_2");
          expect(forceAlignCol.unbounded).toBe(false);
          expect(forceAlignCol.uniqueValues).toStrictEqual(
            new Set(["force_alignment", "Dark", "Light"])
          );
        });
      });

      describe("with cache file", () => {
        beforeEach(async () => {
          await tryDeleteFile(cacheFilePath);
        });

        it("caches file metadata", async () => {
          const input: CreateInput = {
            delimiter: "|",
            filePath: STAR_WARS_CHARACTERS,
            maxCardinality: 2,
            metadataFilePath: cacheFilePath,
          };
          const expected = await FileMetadata.create(input);

          const actual = await FileMetadata.create(input);

          const expectEqual = (
            expected: ColumnMetadata,
            actual: ColumnMetadata
          ) => {
            expect(actual.cardinality).toBe(expected.cardinality);
            expect(actual.maxLength).toBe(expected.maxLength);
            expect(actual.name).toBe(expected.name);
            expect(actual.unbounded).toBe(expected.unbounded);
            expect(actual.uniqueValues).toStrictEqual(expected.uniqueValues);
          };
          expect(actual.columns.length).toBe(expected.columns.length);
          expectEqual(expected.columns[0], actual.columns[0]);
          expectEqual(expected.columns[1], actual.columns[1]);
          expect(getFileLinesMock).toBeCalledTimes(1);
        });
      });
    });
  });
});

async function tryDeleteFile(filePath: string): Promise<void> {
  try {
    await rm(filePath);
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw e;
    }
  }
}
