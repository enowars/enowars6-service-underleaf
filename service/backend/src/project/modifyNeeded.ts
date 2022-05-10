import { RequestHandler } from "express";
import { canModifyProjectByRequest } from "./canModifyProject";

export const modifyNeeded: RequestHandler = async (req, res, next) => {
  if (await canModifyProjectByRequest(req, req.params.id)) {
    next();
  } else {
    res
      .status(403)
      .json({ status: "You are not allowed to modify this project." });
  }
};
