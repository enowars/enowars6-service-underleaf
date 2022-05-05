import { RequestHandler } from "express";
import { verify } from "jsonwebtoken";
import { getJwtSecret } from "./jwt";

export const loggedIn:RequestHandler = async (req, res, next) => {
    

    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.substring(7);
        
        let decoded;
        try{
            decoded = await verify(token, getJwtSecret());
        }catch(e){
            res.status(401).json({status: 'invalid token'});
            return;
        }
        
        req.body.auth = decoded;

        next();
        return;
    }

    res.status(401).json({status: 'no token provided'});
}