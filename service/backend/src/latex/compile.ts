import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { docker } from "./connection";
import { createReadStream, createWriteStream, promises } from "fs";
import { resolve, parse } from "path";

import tar from "tar";
import { getProjectCompilePath, getProjectPath } from "../helpers/project";
import { latexDockerImage } from "./constats";
import { Container } from "node-docker-api/lib/container";

import Nonce from "./nonceSchema";
import crypto from "crypto";

const actionTimeout = 1000;

function trimmedBufferToString(buffer: Buffer): string {
  return buffer.toString("utf8", 8);
}

async function removeContainer(container: Container) {
  try {
    await container.kill();
  } catch (e) { }
  try {
    await container.delete({ force: true });
  } catch { }
}

export const compileProject: RequestHandler = async (req, res, next) => {
  try {
    if (!req.body.file) {
      console.log("no file");
      res.status(400).json({ status: "no file provided" });
      return;
    }

    if (!req.body.proofOfWork) {
      console.log("no pwo");
      res.status(400).json({ status: "no proof of work provided" });
      return;
    }

    const poW = req.body.proofOfWork;
    const nonce = new TextEncoder().encode(poW);

    const hash = crypto.createHash("sha256").update(nonce).digest("hex");

    if (!hash.endsWith("0000")) {
      console.log("invalid proof of work");
      console.log({ hash, poW });
      res.status(400).json({ status: "proof of work is too low" });
      return;
    }

    const n = new Nonce({ nonce: req.body.proofOfWork });
    try {
      await n.save();
    } catch (e) {
      console.log("nonce already exists");
      res.status(400).json({ status: "proof of work is already used" });
      return;
    }

    const container = await docker.container.create({
      Image: latexDockerImage,
      WorkingDir: "/data",
      Cmd: ["pdflatex", "-shell-escape", "/data/" + req.body.file],
      User: "1000:1000",
      NetworkMode: "host",
    });

    const tarPath = "/tmp/" + req.params.id + ".tar";
    const tarProm: Promise<void> = tar.create(
      {
        gz: false,
        cwd: resolve(getProjectPath(req.params.id)),
        file: tarPath,
        prefix: "data/",
      } as any,
      ["./"]
    ) as any;

    if ((await Promise.any([timeout(actionTimeout), tarProm])) === "timeout") {
      console.log("tar");
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
      finish = await Promise.any([
        timeout(actionTimeout * 1.5),
        container.wait(),
      ]);
    } catch {
      console.log("container");
      res.status(500).json({ status: "could not create continer." });
      return;
    }

    if (finish !== "timeout") {
      const outputPath = getProjectCompilePath(req.params.id) + ".pdf";
      await promises.mkdir(resolve(outputPath, ".."), { recursive: true });

      try {
        const stream = (await container.fs.get({
          path: "/data/" + parse(req.body.file).name + ".pdf",
        })) as any;
        const output = createWriteStream(outputPath);

        stream.pipe(output);

        await Promise.any([
          timeout(actionTimeout),
          new Promise((resolve) => stream.on("finish", resolve)),
        ]);
      } catch {
        removeContainer(container);
        console.log(output);
        res.status(400).json({ status: "compile failed", output });
        return;
      }
    }

    removeContainer(container);

    if (finish !== "timeout") {
      res.json(status_ok);
    } else {
      console.log("container timeout");
      res.status(400).send({ status: "container timed out", output });
    }
  } catch (e) { next(e); }
};

function timeout(time: number): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve("timeout");
    }, time)
  );
}
