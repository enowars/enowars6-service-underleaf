import { resolve } from 'path';

import { RequestHandler } from "express";
import { getProjectPath } from "../helpers/project";

export const downloadFile: RequestHandler = async function (req, res) {
    const projPath = resolve(getProjectPath(req.params.id));
    const reqPath = req.params[0];
    const path = resolve(projPath, reqPath);
    
    if(path.startsWith(projPath)){
        res.download(path);
    }else{
        res.json({status: 'Do not try to hack me!'});
    }
}