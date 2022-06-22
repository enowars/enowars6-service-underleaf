import { promises as fs } from "fs";
import { resolve } from "path";
import { exists, lexists } from "./existsAsync";

// checks if a path (containing symlinks) resolves to a path containing a specific prefix (uses realpath, but dose not error if a suffix of the path dose not exist).
export async function symlinkPathResolvesTo(
  path: string,
  prefix: string
): Promise<boolean> {
  let rpath = resolve(path);

  // realpath needs the path to exist -> chop off stuff from the end, until it does or a dangeling symlink is found
  while (!(await lexists(rpath))) {
    rpath = resolve(rpath, "..");
  }

  if (!(await exists(rpath))) {
    // if exists is false, but fexists was true, we know that path is to a dangeling symlink
    const target = await fs.readlink(rpath);

    if (target.startsWith("/")) {
      return await symlinkPathResolvesTo(target, prefix);
    } else {
      rpath = resolve(rpath, "..", target); // resolve a relative link, '..' consumes the links name from rpath
      return await symlinkPathResolvesTo(rpath, prefix); // this path may now contain symlinks again...
    }
  } else {
    // resolve our path that now actually exists
    rpath = await fs.realpath(rpath);
  }

  return rpath.startsWith(await fs.realpath(prefix)); // finally check if our prefix is present!
}
