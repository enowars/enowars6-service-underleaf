import { RequestHandler } from "express";
import { asyncExec, gitPush } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const pushProject: RequestHandler = async (req, res, next) => {
  try {
    const path = getProjectPath(req.params.id);

    await gitPush(path);

    res.send(status_ok);
  } catch (e) {
    next(e);
  }
};
