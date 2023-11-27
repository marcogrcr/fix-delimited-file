import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export interface GetFileLinesInput {
  /** The file's encoding. */
  readonly encoding?: BufferEncoding;

  /** The file path. */
  readonly filePath: string;
}

/** Returns an async generator that yields lines of a text file. */
export async function* getFileLines(
  input: GetFileLinesInput
): AsyncGenerator<string> {
  const { encoding, filePath } = input;
  const stream = createReadStream(filePath, { encoding });
  const readLine = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of readLine) {
    yield line;
  }

  readLine.close();
}
