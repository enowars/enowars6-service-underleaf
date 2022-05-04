import { RequestHandler } from "express";

import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { getProjectPath } from "../helpers/project";
import { gitSetupProject } from "../helpers/git";



export const createProject:RequestHandler = async (req, res) => {
    const id = randomBytes(32).toString('hex');
    const path = getProjectPath(id);

    mkdirSync(path, { recursive: true });

    await gitSetupProject(path);

    res.json({ status: 'ok', id });
}