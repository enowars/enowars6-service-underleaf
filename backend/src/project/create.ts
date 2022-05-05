import { RequestHandler } from "express";

import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { getProjectPath, getProjectRemoteGitPath, getRemoteGitUrl } from "../helpers/project";
import { gitSetupProject } from "../helpers/git";



export const createProject:RequestHandler = async (req, res) => {
    const id = randomBytes(32).toString('hex');
    const path = getProjectPath(id);
    const remotePath = getProjectRemoteGitPath(id);

    mkdirSync(path, { recursive: true });
    mkdirSync(remotePath, { recursive: true });

    await gitSetupProject(path, remotePath, getRemoteGitUrl(id));

    res.json({ status: 'ok', id });
}