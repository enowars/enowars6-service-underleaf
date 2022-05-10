import { resolve } from "path";
import { promises, existsSync } from "fs";

import { RequestHandler } from "express";
import { getProjectPath } from "../helpers/project";

export const downloadFile: RequestHandler = async function (req, res) {
  const projPath = resolve(getProjectPath(req.params.id));
  const reqPath = req.params[0];
  const path = resolve(projPath, reqPath);

  if (path.startsWith(projPath)) {
    if (existsSync(path) && (await promises.lstat(path)).isDirectory()) {
      res.status(403).send({ status: "path is a directory" });
      return;
    }

    if (path.startsWith(resolve(projPath, ".git"))) {
      res.status(403).send({ status: "path is in .git" });
      return;
    }

    res.download(path);
  } else {
    res.json({ status: "Do not try to hack me!" });
  }
};
