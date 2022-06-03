import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import User from "./userSchema";

export const deleteAccount: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.auth.username });
    await user.remove();
    res.status(200).json(status_ok);
  } catch (e) {
    next(e);
  }
};
