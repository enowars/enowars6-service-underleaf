import { promises as fs } from "fs";
import { resolve } from "path";
import { exists, lexists } from "./existsAsync";

// checks if a path (containing symlinks) resolves to a path containing a specific prefix (uses realpath, but dose not error if a suffix of the path dose not exist).
export async function symlinkPathResolvesTo(
  path: string,
  prefix: string
): Promise<boolean> {
  let rpath = resolve(path);
  console.log("rpath", rpath);

  // realpath needs the path to exist -> chop off stuff from the end, until it does or a dangeling symlink is found
  while (!(await lexists(rpath))) {
    rpath = resolve(rpath, "..");
    console.log("rpath", rpath);
  }

  if(!await exists(rpath)){
    // if exists is false, but fexists was true, we know that path is to a dangeling symlink
    const target = await fs.readlink(rpath);
    console.log("symlink daneling");

    if(target.startsWith("/")){
      console.log("absolute symlink");
      return await symlinkPathResolvesTo(target, prefix);
    }else{
      rpath = resolve(rpath, '..', target); // resolve a relative link, '..' consumes the links name from rpath
      console.log("relative symlink");
      return await symlinkPathResolvesTo(rpath, prefix); // this path may now contain symlinks again...
    }
  }else{
    // resolve our path that now actually exists
    rpath = await fs.realpath(rpath);
    console.log("realpath", rpath);
  }

  console.log("startsWith", rpath, prefix)
  return rpath.startsWith(await fs.realpath(prefix)); // finally check if our prefix is present!
}
