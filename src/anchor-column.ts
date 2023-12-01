import { ColumnMetadata } from "./file-metadata.js";

/**
 * Defines an anchor column entry which is one of the following:
 * - A {@link ColumnMetadata} with {@link ColumnMetadata.unbounded} set to `false`.
 * - An invisible final column in a list of {@link ColumnMetadata} if the last column has
 *   {@link ColumnMetadata.unbounded} set to `true`.
 *
 * Anchor columns help disambiguate malformed lines whose column values contain the delimiter character.
 */
export interface AnchorColumn {
  /** The number of columns prior to the anchor column. */
  readonly previousColumns: number;

  /**
   * The {@link ColumnMetadata} of the anchor column.
   * Omitted if it's the invisible final column.
   */
  readonly metadata?: ColumnMetadata;
}

/**
 * Gets the {@link AnchorColumn}s from a list of {@link ColumnMetadata}.
 *
 * For example, given the following four {@link ColumnMetadata} entries:
 * ```
 * [
 *   { name: "first_name", unbounded: true, ... },
 *   { name: "last_name", unbounded: true, ... },
 *   { name: "sex", unbounded: false, ... },
 *   { name: "hobbies", unbounded: true, ... }
 * ]
 * ```
 *
 * The corresponding {@link AnchorColumn}s are:
 * ```
 * [
 *   {
 *     previousColumns: 2, // ["first_name", "last_name"]
 *     metadata: { name: "sex", ... }
 *   },
 *   {
 *     previousColumns: 1, // ["hobbies"],
 *     metadata: undefined
 *   }
 * ]
 * ```
 */
export function getAnchorColumns(
  columns: readonly ColumnMetadata[]
): readonly AnchorColumn[] {
  const result: AnchorColumn[] = [];

  let i = 0;
  let previousColumns = 0;

  // while there are columns left
  while (i < columns.length) {
    if (!columns[i++].unbounded) {
      // found bounded column: add anchor
      result.push({
        previousColumns,
        metadata: columns[i - 1],
      });
      // reset previous columns
      previousColumns = 0;
    } else {
      ++previousColumns;
      if (i === columns.length) {
        // last column is unbounded: add invisible final anchor
        result.push({ previousColumns });
      }
    }
  }

  return result;
}
