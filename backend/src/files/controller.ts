import { existsSync, readdirSync } from 'fs';

import { RequestHandler } from "express";
import { UploadedFile } from "express-fileupload";

export const uploadFiles: RequestHandler = function (req, res) {
    if(!req.files){
        res.status(400).send('No files were uploaded.');
    }
    
    // iterate over files
    for (const key in req.files) {
        const file = req.files[key] as UploadedFile;

        const path = "/uploads/" + file.md5.substring(0, 16);
        if(!existsSync(path)){
            file.mv(path)
        }
    }

    res.json({status: "ok"});
}

export const getFilesPresent: RequestHandler = function (req, res) {
    const needles = req.body;
    
    if(Array.isArray(needles)){
        const files = readdirSync('./uploads/');

        const needlesCaseInsesitve = needles.map(needle => new RegExp('^' + needle + '$', 'i'));

        const filesPresent = files.filter(straw => 
            needlesCaseInsesitve.some(needle => needle.test(straw))
        );

        res.json(filesPresent);
    }else{
        res.status(400).send("Invalid request");
    }
}