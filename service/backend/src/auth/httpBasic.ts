import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { canModifyProject } from "../project/canModifyProject";
import { checkLogin } from "./checker";

export const httpBasic: RequestHandler = async (req, res, next) => {
  try {
    const url =
      typeof req.headers["x-original-url"] === "string"
        ? req.headers["x-original-url"]
        : "in://valid";
    const originalUrl = new URL(url);

    if (
      originalUrl.pathname.startsWith("/git/") &&
      typeof originalUrl.pathname.split("/")[2] === "string"
    ) {
      const header = req.headers["authorization"];
      if (header && header.startsWith("Basic ")) {
        const base64 = header.split(" ")[1];
        const [username, password] = Buffer.from(base64, "base64")
          .toString()
          .split(":");

        if (await checkLogin(username, password)) {
          if (
            await canModifyProject(username, originalUrl.pathname.split("/")[2])
          ) {
            res.json(status_ok);
            return;
          }
        }
      }
    }

    res.status(401).json({ status: "unauthorized" });
  } catch (e) { next(e); }
};
