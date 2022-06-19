import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { docker } from "./connection";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { resolve, parse } from "path";

import tar from "tar";
import { getProjectCompilePath, getProjectPath } from "../helpers/project";
import { latexDockerImage } from "./constats";
import { Container } from "node-docker-api/lib/container";

import Nonce from "./nonceSchema";
import crypto from "crypto";

const actionTimeout = 1500;

function trimmedBufferToString(buffer: Buffer): string {
  return buffer.toString("utf8", 8);
}

async function removeContainer(container: Container) {
  try {
    await container.kill();
  } catch (e) {}
  try {
    await container.delete({ force: true });
  } catch {}
}

export const compileProject: RequestHandler = async (req, res, next) => {
  try {
    if (!req.body.file) {
      res.status(400).json({ status: "no file provided" });
      return;
    }

    if (!req.body.proofOfWork) {
      res.status(400).json({ status: "no proof of work provided" });
      return;
    }

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

    const container = await docker.container.create({
      Image: latexDockerImage,
      WorkingDir: "/data",
      Cmd: ["pdflatex", "-shell-escape", "/data/" + req.body.file],
      User: "1000:1000",
      CpuPercent: 50,
      NetworkMode: "host",
    });

    const tarPath = "/tmp/" + req.params.id + ".tar";
    const tarProm: Promise<void> = tar.create(
      {
        gz: false,
        cwd: getProjectPath(req.params.id),
        file: tarPath,
        prefix: "data/",
      } as any,
      ["./"]
    ) as any;

    if ((await timeout(actionTimeout, tarProm)) === "timeout") {
      res.status(400).json({ status: "tar timed out" });
      return;
    }

    await container.fs.put(createReadStream(tarPath), { path: "/" });

    await container.start();

    const stream: any = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    let output = "";
    stream.on("data", (d: Buffer) => {
      output += trimmedBufferToString(d);
    });

    let finish;
    try {
      if (
        (await timeout(actionTimeout * 1.5, container.wait())) === "timeout"
      ) {
        res.status(400).json({ status: "compile timed out" });
        return;
      }
    } catch {
      res.status(500).json({ status: "could not create continer." });
      return;
    }

    if (finish !== "timeout") {
      const outputPath = getProjectCompilePath(req.params.id) + ".pdf";
      await fs.mkdir(resolve(outputPath, ".."), { recursive: true });

      try {
        const stream = (await container.fs.get({
          path: "/data/" + parse(req.body.file).name + ".pdf",
        })) as any;
        const output = createWriteStream(outputPath);

        if (
          (await timeout(
            actionTimeout,
            new Promise((resolve) => {
              output.on("finish", resolve);
              stream.pipe(output);
            })
          )) === "timeout"
        ) {
          removeContainer(container);
          res.status(400).json({ status: "read file timed out" });
          return;
        }
      } catch {
        removeContainer(container);
        res.status(400).json({ status: "compile failed", output });
        return;
      }
    }

    removeContainer(container);

    if (finish !== "timeout") {
      res.json(status_ok);
    } else {
      res.status(400).send({ status: "container timed out", output });
    }
  } catch (e) {
    next(e);
  }
};

function timeout<T>(time: number, prom: Promise<T>): Promise<T | string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resolve("timeout");
    }, time);

    prom.then(
      (val: T) => {
        clearTimeout(timeoutId);
        resolve(val);
      },
      (val: T) => {
        clearTimeout(timeoutId);
        resolve(val);
      }
    );
  });
}
