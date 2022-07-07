import { RequestHandler } from "express";
import { gitPull } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const pullProject: RequestHandler = async (req, res, next) => {
  try {
    const path = getProjectPath(req.params.id);

    await gitPull(path);

    res.send(status_ok);
  } catch (e) {
    next(e);
  }
};
