import { RequestHandler } from "express";

import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { getProjectPath, getProjectRemoteGitPath, getRemoteGitUrl } from "../helpers/project";
import { gitSetupProject } from "../helpers/git";
import { status_ok } from "../helpers/status";
import Project from "./projectSchema";
import User from "../auth/userSchema";



export const createProject:RequestHandler = async (req, res) => {
    const id = randomBytes(32).toString('hex');
    const path = getProjectPath(id);
    const remotePath = getProjectRemoteGitPath(id);

    mkdirSync(path, { recursive: true });
    mkdirSync(remotePath, { recursive: true });

    await gitSetupProject(path, remotePath, getRemoteGitUrl(id));

    const user = await User.findOne({username: req.body.auth.username});
    const proj = new Project({
        id,
        owner: user.id,
    });
    
    await proj.save();

    res.json({ id, ... status_ok });
}