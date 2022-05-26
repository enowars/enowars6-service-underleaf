import { RequestHandler } from "express";
import { asyncExec } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const pullProject: RequestHandler = async (req, res, next) => {
  try {
    const path = getProjectPath(req.params.id);
    await asyncExec(
      `cd ${path}; git fetch origin && git reset --hard origin/master`
    );

    res.send(status_ok);
  } catch (e) {
    next(e);
  }
};
