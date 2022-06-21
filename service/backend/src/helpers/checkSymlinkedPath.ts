import { promises as fs } from "fs";
import { resolve } from "path";
import { exists } from "./existsAsync";

// checks if a path (containing symlinks) resolves to a path containing a specific prefix (uses realpath, but dose not error if parts of the path do not exsist).
export async function symlinkPathResolvesTo(
  path: string,
  prefix: string
): Promise<boolean> {
  let rpath = resolve(path);

  while (!(await exists(rpath))) {
    rpath = resolve(rpath, "..");
  }

  rpath = await fs.realpath(rpath);

  return rpath.startsWith(await fs.realpath(prefix));
}
