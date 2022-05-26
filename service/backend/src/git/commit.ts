import { RequestHandler } from "express";
import { gitCommit } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const commitProject: RequestHandler = async (req, res, next) => {
  try {
    const path = getProjectPath(req.params.id);

    await gitCommit(path, req.body.message);

    res.send(status_ok);
  } catch (e) { next(e); }
};
