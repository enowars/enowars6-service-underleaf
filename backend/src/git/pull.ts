import { RequestHandler } from "express";
import { asyncExec } from "../helpers/git";
import { getProjectPath } from "../helpers/project";
import { status_ok } from "../helpers/status";

export const pullProject:RequestHandler = async (req, res) => {
    
    const path = getProjectPath(req.params.id);
    await asyncExec(`cd ${path}; git fetch --all && git reset --hard origin/master`);

    res.send(status_ok);
}