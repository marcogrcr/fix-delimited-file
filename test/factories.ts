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
