import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * A file with `"latin1"` encoding.
 * @see https://en.wikipedia.org/wiki/ISO/IEC_8859-1
 */
export const LATIN_1 = join(__dirname, "latin1.txt");

/** A file without a new line at the end. */
export const NO_NEW_LINE = join(__dirname, "no-new-line.txt");

/** A file with three lines. */
export const THREE_LINES = join(__dirname, "three-lines.txt");
