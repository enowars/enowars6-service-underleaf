import { RequestHandler } from "express";
import { status_ok } from "../helpers/status";
import { docker } from "./connection";
import { createReadStream, createWriteStream, promises } from "fs";
import { resolve, parse } from "path";

import tar from "tar";
import { getProjectCompilePath, getProjectPath } from "../helpers/project";
import { latexDockerImage } from "./constats";

const actionTimeout = 1000;

function trimmedBufferToString(buffer: Buffer): string {
  return buffer.toString("utf8", 8);
}

export const compileProject: RequestHandler = async (req, res) => {
  if(!req.body.file){
    res.status(400).json({status: 'no file provided'});
  }

  const container = await docker.container.create({
    Image: latexDockerImage,
    Cmd: ["pdflatex", "-shell-escape", "/data/" + req.body.file],
  });
  
  const tarPath = '/tmp/' + req.params.id + '.tar';
  const tarProm:Promise<void> = tar.create({
    gz: false,
    cwd: resolve(getProjectPath(req.params.id)),
    file: tarPath,
    prefix: 'data/'
  } as any, ['./']) as any;

  if((await Promise.any([timeout(actionTimeout), tarProm])) === 'timeout') {
    res.status(400).json({status: 'tar timed out'});
    return
  }
  
  await container.fs.put(createReadStream(tarPath), {path: '/'})

  await container.start();

  const stream: any = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
  });

  let output = "";
  stream.on("data", (d: Buffer) => {output += trimmedBufferToString(d);});

  const finish = await Promise.any([timeout(actionTimeout), container.wait()]);

  if(finish !== 'timeout') {

    const outputPath = getProjectCompilePath(req.params.id) + '.pdf';

    await promises.mkdir(resolve(outputPath, ".."), { recursive: true });

    const stream = await container.fs.get({path: '/' + parse(req.body.file).name + '.pdf'}) as any;
    const output = createWriteStream(outputPath);
    
    stream.pipe(output);

    await Promise.any([timeout(actionTimeout), new Promise((resolve) => stream.on('finish', resolve))]);

  }

  try {
    await container.kill();
  } catch (e) {}
  try {
    await container.delete({ force: true });
  } catch {}

  if (finish !== "timeout") {
    res.send({ output, ...status_ok });
  } else {
    res.status(400).send({ status: "container timed out",  output });
  }
};

function timeout(time: number): Promise<string> {
  return new Promise((resolve) => setTimeout(() => {resolve('timeout')}, time));
}
