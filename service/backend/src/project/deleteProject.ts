import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import Project from "./projectSchema";

export const deleteProject: RequestHandler = async (req, res, next) => {
    try{
        if(typeof req.body.id !== "string"){
            res.status(400).json({status: "Project id is required"});
            return;
        }
        
        const project = await Project.findOne({id: req.body.id});
        if(!project){
            res.status(400).json({status: "Project not found"});
            return;
        }
        await project.remove();

        res.json(status_ok);
    }catch(e){
        next(e);
    }
}