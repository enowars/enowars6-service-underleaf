import { RequestHandler } from "express";
import { getProjectCompilePath } from "../helpers/project";

export const getOutput: RequestHandler = async (req, res) => {
    res.download(getProjectCompilePath(req.params.id) + ".pdf");
}