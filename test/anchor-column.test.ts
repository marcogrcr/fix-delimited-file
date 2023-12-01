import { describe, expect, it } from "vitest";

import { getAnchorColumns } from "../src/anchor-column.js";
import { ColumnMetadata } from "../src/file-metadata.js";

describe("anchor-column", () => {
  describe("getAnchorColumns", () => {
    describe("no bounded columns", () => {
      it("returns single-item array with all columns as previous columns", () => {
        const columns = [
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          // { previousColumns: 3 }
        ];

        const actual = getAnchorColumns(columns);

        expect(actual).toStrictEqual([{ previousColumns: 3 }]);
      });
    });

    describe("all bounded columns", () => {
      it("returns same-size array with each column metadata", () => {
        const columns = [
          createColumnMetadata({ unbounded: false }), // { previousColumns: 0 }
          createColumnMetadata({ unbounded: false }), // { previousColumns: 0 }
          createColumnMetadata({ unbounded: false }), // { previousColumns: 0 }
        ];

        const actual = getAnchorColumns(columns);

        expect(actual).toStrictEqual([
          { previousColumns: 0, metadata: columns[0] },
          { previousColumns: 0, metadata: columns[1] },
          { previousColumns: 0, metadata: columns[2] },
        ]);
      });
    });

    describe("mixed columns ending in bounded column", () => {
      it("returns array with same number of bounded columns", () => {
        const columns = [
          createColumnMetadata({ unbounded: false }), // { previousColumns: 0 }
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: false }), // { previousColumns: 1 }
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: false }), // { previousColumns: 2 }
        ];

        const actual = getAnchorColumns(columns);

        expect(actual).toStrictEqual([
          { previousColumns: 0, metadata: columns[0] },
          { previousColumns: 1, metadata: columns[2] },
          { previousColumns: 2, metadata: columns[5] },
        ]);
      });
    });

    describe("mixed columns ending in unbounded column", () => {
      it("returns array with number of bounded columns plus one", () => {
        const columns = [
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: false }), // { previousColumns: 2 }
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: false }), // { previousColumns: 1 }
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          createColumnMetadata({ unbounded: true }),
          // { previousColumns: 3 }
        ];

        const actual = getAnchorColumns(columns);

        expect(actual).toStrictEqual([
          { previousColumns: 2, metadata: columns[2] },
          { previousColumns: 1, metadata: columns[4] },
          { previousColumns: 3 },
        ]);
      });
    });
  });
});

function createColumnMetadata({
  unbounded,
}: {
  unbounded: boolean;
}): ColumnMetadata {
  return ColumnMetadata.fromJson({
    maxLength: 0,
    name: "",
    unbounded,
    uniqueValues: [],
  });
}
