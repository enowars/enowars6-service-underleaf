import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { docker } from "./connection";

export const compileProject: RequestHandler = async (req, res) => {
  const container = await docker.container.create({
    Image: "alpine",
    Cmd: ["echo", "Hello from alpine in docker in docker"],
  });
  await container.start();

  let output = "";
  const stream: any = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
  });
  stream.on("data", (d: any) => (output += d.toString()));

  const finish = await Promise.any([sleep(1000), container.wait()]);

  try {
    await container.kill();
  } catch (e) {}
  try {
    await container.delete({ force: true });
  } catch {}

  if (typeof finish !== "undefined") {
    res.send({ output, ...status_ok });
  } else {
    res.send({ status: "container timed out", output });
  }
};

function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}
