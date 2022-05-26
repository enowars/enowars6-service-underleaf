import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import User from "./userSchema";
import { hash } from "bcrypt";
import { createJwt } from "./jwt";

export const register: RequestHandler = async (req, res, next) => {
  try {
    if (
      req.body.username &&
      typeof req.body.username === "string" &&
      req.body.username.length > 0 &&
      req.body.password &&
      typeof req.body.password === "string" &&
      req.body.password.length > 0
    ) {
      const hashed = await hash(req.body.password, 10);

      const user = new User({
        username: req.body.username,
        password: hashed,
      });

      try {
        await user.save();
      } catch (err: any) {
        if (err.code === 11000) {
          res.status(400).json({ status: "username already exists." });
        } else {
          console.error(err);
          res.status(500).json({ status: "error creating user." });
        }
        return;
      }
      res.json({ token: createJwt(req.body.username), ...status_ok });
      return;
    }
    res.status(400).send({ status: "invalid username or password." });
  } catch (e) { next(e); }
};
