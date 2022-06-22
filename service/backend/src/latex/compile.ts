import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";

import { getProjectCompilePath, getProjectPath } from "../helpers/project";
import { latexDockerImage } from "./constats";

import Nonce from "./nonceSchema";
import crypto from "crypto";
import {
  DockerExecError,
  execInDocker,
  TimeoutError,
} from "../helpers/execInDocker";

import { promises as fs } from "fs";
import { resolve, parse } from "path";

export const compileProject: RequestHandler = async (req, res, next) => {
  try {
    // check that all params are present
    if (!req.body.file) {
      res.status(400).json({ status: "no file provided" });
      return;
    }

    if (!req.body.proofOfWork) {
      res.status(400).json({ status: "no proof of work provided" });
      return;
    }

    // check that the proof of work is valid
    const poW = req.body.proofOfWork;
    const nonce = new TextEncoder().encode(poW);

    const hash = crypto.createHash("sha256").update(nonce).digest("hex");

    if (!hash.endsWith("0000")) {
      res.status(400).json({ status: "proof of work is too low" });
      return;
    }

    const n = new Nonce({ nonce: req.body.proofOfWork });
    try {
      await n.save();
    } catch (e) {
      res.status(400).json({ status: "proof of work is already used" });
      return;
    }

    // compile the project
    try {
      const outputPath = getProjectCompilePath(req.params.id) + ".pdf";
      await fs.mkdir(resolve(outputPath, ".."), { recursive: true });

      await execInDocker(
        latexDockerImage,
        ["pdflatex", "-shell-escape", "/data/" + req.body.file],
        "/data",
        getProjectPath(req.params.id),
        "data/",
        "/data/" + parse(req.body.file).name + ".pdf",
        outputPath,
        1500,
        false
      );
    } catch (e) {
      // Bubble errors
      if (e instanceof TimeoutError) {
        res.status(400).json(e.message);
        return;
      } else if (e instanceof DockerExecError) {
        res.status(400).json({ status: "Compile failed", output: e.output });
        return;
      } else {
        throw e;
      }
    }

    res.json(status_ok);
  } catch (e) {
    await next(e);
  }
};
