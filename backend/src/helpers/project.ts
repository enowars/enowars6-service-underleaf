import { RequestHandler } from 'express';
import { existsSync } from 'fs';

export function projectIdIsSafe(id:string): boolean {
    return /^[0-9a-fA-F]+$/.test(id);
}

export function getProjectPath(id: string): string {
    if(projectIdIsSafe(id)) {
        return `./data/projects/${id}`;
    }else{
        throw "Invalid project id";
    }
}

export function projectIsSafe(id:string): boolean {
    return projectIdIsSafe(id) && existsSync(getProjectPath(id));
}

export const reqProjectIdIsSafe: RequestHandler = (req, res, next) => {
    if(req.body.id && typeof req.body.id === 'string' && projectIsSafe(req.body.id)){
        next();
        return;
    }
    res.status(400).json({status: 'Project id is invalid'});
}