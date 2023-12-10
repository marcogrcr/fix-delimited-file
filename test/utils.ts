import { rm } from "node:fs/promises";

import { ColumnMetadata } from "../src/file-metadata.js";

export function createColumnMetadata({
  unbounded,
  uniqueValues = [],
}: {
  readonly unbounded: boolean;
  readonly uniqueValues?: readonly string[];
}): ColumnMetadata {
  return ColumnMetadata.fromJson({
    maxLength: 0,
    name: "",
    unbounded,
    uniqueValues,
  });
}

export async function tryDeleteFile(filePath: string): Promise<void> {
  try {
    await rm(filePath);
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw e;
    }
  }
}
