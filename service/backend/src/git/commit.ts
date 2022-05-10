import { RequestHandler } from "express";
import { gitCommit } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const commitProject: RequestHandler = async (req, res) => {
  const path = getProjectPath(req.params.id);

  console.log(req.body.message);
  await gitCommit(path, req.body.message);

  res.send(status_ok);
};
