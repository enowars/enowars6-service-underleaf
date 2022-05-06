import shellescape from "shell-escape";

import { RequestHandler } from "express";
import { asyncExec } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const commitProject: RequestHandler = async (req, res) => {
  const path = getProjectPath(req.params.id);
  await asyncExec(
    `cd ${path}; git add . && git commit -m ${shellescape([
      req.body.message,
    ])} || true`
  );

  res.send(status_ok);
};
