import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { checkLogin } from "./checker";

export const httpBasic:RequestHandler = async (req, res) => {
    const header = req.headers['authorization'];
    if(header && header.startsWith('Basic ')){
        const base64 = header.split(' ')[1];
        const [username, password] = Buffer.from(base64, 'base64').toString().split(':');

        
        if(await checkLogin(username, password)){
            res.json(status_ok);
            return;
        }
    }

    res.status(401).json({status: 'unauthorized'});
}