import { resolve } from "path";
import { promises, existsSync } from "fs";

import { RequestHandler } from "express";
import { getProjectPath } from "../helpers/project";
import { UploadedFile } from "express-fileupload";
import { status_ok } from "../helpers/status";

export const uploadFile: RequestHandler = async function (req, res) {
  const projPath = resolve(getProjectPath(req.params.id));
  const reqPath = req.params[0];
  const path = resolve(projPath, reqPath);

  if (path.startsWith(projPath)) {
    if (existsSync(path) && !(await promises.lstat(path)).isFile()) {
      res.status(403).send({ status: "path is a directory" });
      return;
    }

    if (path.startsWith(resolve(projPath, ".git"))) {
      res.status(403).send({ status: "path is in .git" });
      return;
    }

    for (const key in req.files) {
      const file = req.files[key] as UploadedFile;

      await promises.mkdir(resolve(path, ".."), { recursive: true });

      file.mv(path);

      res.json(status_ok);
      return;
    }
  } else {
    res.json({ status: "Do not try to hack me!" });
  }
};