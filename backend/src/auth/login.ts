import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { checkLogin } from "./checker";
import { createJwt } from "./jwt";

export const login:RequestHandler = async (req, res) => {
    if(req.body.username && typeof req.body.username === 'string' && req.body.username.length > 0
    && req.body.password && typeof req.body.password === 'string' && req.body.password.length > 0){
        const {username, password} = req.body;
        if(await checkLogin(username, password)){
            res.json({token: createJwt(username), ... status_ok});
            return;
        }
    }

    res.status(401).json({status: 'Invalid login'});
}