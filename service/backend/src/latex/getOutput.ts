import { RequestHandler } from "express";
import { getProjectCompilePath } from "../helpers/project";

export const getOutput: RequestHandler = async (req, res, next) => {
  try {
    res.download(getProjectCompilePath(req.params.id) + ".pdf");
  } catch (e) {
    next(e);
  }
};
