import { RequestHandler } from "express";
import User from "../auth/userSchema";
import { status_ok } from "../helpers/status";
import Project from "./projectSchema";

export const listProjects: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.auth.username });
    const projects = await Project.find({ owner: user.id });

    const cleanedProjects = projects.map((project) => {
      return { id: project.id, name: project.name };
    });

    res.json({ projects: cleanedProjects, ...status_ok });
  } catch (e) {
    next(e);
  }
};
