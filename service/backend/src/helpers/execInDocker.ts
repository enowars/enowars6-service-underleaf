import { Container } from "node-docker-api/lib/container";
import tar from "tar";
import { docker } from "../helpers/dockerConnection";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

function removeContainer(container: Container) {
  setTimeout(async ()=>{
    try {
      await container.delete({ force: true });
    } catch {}
  }, 500);
}

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

export class TimeoutError extends Error {}
export class DockerExecError extends Error {
  public readonly output: string;
  constructor(message: string, output: string) {
    super(message);

    this.output = output;
  }
}

function trimmedBufferToString(buffer: Buffer): string {
  return buffer.toString("utf8", 8);
}

export async function execInDocker(
  image: string,
  command: Array<string>,
  workingDir: string,
  importPath: string,
  tarPrefix: string,
  resultPath: string,
  exportPath: string,
  timeoutVal: number,
  resultIsFolder: boolean
): Promise<void> {
  if (!resultPath.startsWith("/")) {
    throw new Error("resultPath needs to be absolute.");
  }

  // create the container
  const containerProm = docker.container.create({ // we do not need to await this yet, as we need to prepare a tar too
    Image: image,
    WorkingDir: workingDir,
    Cmd: command,
    User: "1000:1000",
    CpuPercent: 50,
    NetworkMode: "host",
  });

  // create a tar to copy over the files
  const tarPath =
    (await fs.mkdtemp(resolve(tmpdir(), "underleaf_tar"))) + ".tar";
  const tarProm: Promise<void> = tar.create(
    {
      gz: false,
      cwd: importPath,
      file: tarPath,
      prefix: tarPrefix,
    } as any,
    ["./"]
  ) as any;

  // timeout if taring takes to long
  if ((await timeout(timeoutVal, tarProm)) === "timeout") {
    try {
      fs.rm(tarPath); // no need to wait for this to complete
    } catch {}
    removeContainer(await containerProm);
    throw new TimeoutError("creating tar timed out");
  }

  const container = await containerProm;

  // put files into container
  await container.fs.put(createReadStream(tarPath), { path: "/" });
  // remove the tar
  try {
    fs.rm(tarPath); // no need to wait for this to complete
  } catch {}

  // start the container and read the logs
  await container.start();
  //const stream: any = await container.logs({
  //  follow: true,
  //  stdout: true,
  //  stderr: true,
  //});

  let output = "";
  //stream.on("data", (d: Buffer) => {
  //  output += trimmedBufferToString(d);
  //});

  // wait for container to finish or timeout
  if ((await timeout(timeoutVal * 1.5, container.wait())) === "timeout") {
    removeContainer(container); // no need to wait for this to complete
    console.error(output);
    throw new TimeoutError("Container took to long.");
  }

  if (!resultIsFolder) {
    // read the resultPath, write to outputPath
    try {
      const stream = (await container.fs.get({ path: resultPath })) as any;
      const output = createWriteStream(exportPath);

      await new Promise((resolve) => {
        output.on("finish", resolve);
        stream.pipe(output);
      });
      
    } catch {
      removeContainer(container);
      throw new DockerExecError("Could not read resultPath", output);
    }
  } else {
    // read ot the folder as a tar, write it to tarpath
    try {
      const stream = (await container.fs.get({ path: resultPath })) as any;
      const output = tar.x({
        strip: (resolve(resultPath).match(/\//g) || []).length,
        cwd: exportPath,
      });

      await new Promise((resolve) => {
        output.on("finish", resolve);
        stream.pipe(output);
      });

    } catch {
      removeContainer(container); // no need to wait for this to complete
      throw new DockerExecError("Could not read resultPath", output);
    }
  }

  removeContainer(container); // no need to wait for this to complete
  return;
}
