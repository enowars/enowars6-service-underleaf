import { RequestHandler } from "express";
import { verify } from "jsonwebtoken";
import { getJwtSecret } from "./jwt";
import User from "./userSchema";

export const loggedIn: RequestHandler = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.substring(7);

    let decoded: any;
    try {
      decoded = await verify(token, getJwtSecret());

      // check that we have the user, this may not be the case, if the database got reset
      if(null === await User.findOne( {username: decoded.username})){
        console.log("123")
        throw new Error("");
      }

    } catch (e) {
      res.status(401).json({ status: "login required; invalid token." });
      return;
    }

    req.body.auth = decoded;

    next();
    return;
  }

  res.status(401).json({ status: "login required; no token provided." });
};
