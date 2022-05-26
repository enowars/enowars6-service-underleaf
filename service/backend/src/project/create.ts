import { RequestHandler } from "express";

import { randomBytes } from "crypto";
import { promises } from "fs";
import {
  getProjectPath,
  getProjectRemoteGitPath,
  getRemoteGitUrl,
} from "../helpers/project";
import { gitSetupProject } from "../helpers/git";
import { status_ok } from "../helpers/status";
import Project from "./projectSchema";
import User from "../auth/userSchema";

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    if (!req.body.name || typeof req.body.name !== "string") {
      res.status(400).json({ status: "Project name is required" });
      return;
    }

    const id = randomBytes(32).toString("hex");
    const path = getProjectPath(id);
    const remotePath = getProjectRemoteGitPath(id);

    await promises.mkdir(path, { recursive: true });
    await promises.mkdir(remotePath, { recursive: true });

    await gitSetupProject(path, remotePath, getRemoteGitUrl(id));

    const user = await User.findOne({ username: req.body.auth.username });
    const proj = new Project({
      id,
      owner: user.id,
      name: req.body.name,
    });

    await proj.save();

    res.json({ id, ...status_ok });
  } catch (e) { next(e); }
};
