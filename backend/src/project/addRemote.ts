import { RequestHandler } from "express";

export const addRemote:RequestHandler = async (req, res) => {
    if(req.body.remote && typeof req.body.remote === 'string'){
        
    }else{
        res.status(400).json({status: 'Remote is invalid'});
    }
}