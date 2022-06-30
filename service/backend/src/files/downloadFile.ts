import { resolve } from "path";
import { promises as fs } from "fs";

import { RequestHandler } from "express";
import { getProjectPath } from "../helpers/project";
import { exists } from "../helpers/existsAsync";
import { symlinkPathResolvesTo } from "../helpers/checkSymlinkedPath";

export const downloadFile: RequestHandler = async function (req, res, next) {
  try {
    const projPath = resolve(getProjectPath(req.params.id));
    const reqPath = req.params[0];
    const path = resolve(projPath, reqPath);

    if (await symlinkPathResolvesTo(path, projPath)) {
      if (!(await exists(path))) {
        res.status(404).send("404 file not found");
        return;
      }

      if ((await fs.lstat(path)).isDirectory()) {
        res.status(403).send({ status: "path is a directory" });
        return;
      }

      if (path.startsWith(resolve(projPath, ".git"))) {
        res.status(403).send({ status: "path is in .git" });
        return;
      }

      res.download(path);
    } else {
      res.status(403).json({ status: "File not accessible" });
    }
  } catch (e) {
    next(e);
  }
};
