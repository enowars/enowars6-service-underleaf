import { promises } from 'fs';
import { resolve } from 'path';

import { RequestHandler } from "express";
import { getProjectPath } from '../helpers/project';
import { status_ok } from '../helpers/status';


async function getFiles(dir: string) {
    let stack: Array<string> = [dir];
    let result: Array<string> = [];

    while(stack.length){
        const currentPath = stack.pop() as string;

        const files = await promises.readdir(currentPath, { withFileTypes: true });

        for(const file of files){

            const name = resolve(currentPath, file.name).substring(dir.length + 3)
            if(name === '/.git'){
                continue;
            }
            result.push(name);

            if(file.isDirectory()){
                stack.push(resolve(currentPath, file.name));
            }
        }
    }

    return result;
}

export const listFiles: RequestHandler = async function (req, res) {
    const path = getProjectPath(req.params.id);
    console.log(path)
    res.json( {files: await getFiles(path), ...status_ok});
}