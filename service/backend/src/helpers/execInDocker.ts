import { Container } from "node-docker-api/lib/container";
import tar from "tar";
import { docker } from "../helpers/dockerConnection";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

async function removeContainer(container: Container) {
  try {
    await container.kill();
  } catch (e) {}
  try {
    await container.delete({ force: true });
  } catch {}
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
  const container = await docker.container.create({
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
      await fs.rm(tarPath);
    } catch {}
    throw new TimeoutError("creating tar timed out");
  }

  // put files into container
  await container.fs.put(createReadStream(tarPath), { path: "/" });
  // remove the tar
  try {
    await fs.rm(tarPath);
  } catch {}

  // start the container and read the logs
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

  // wait for container to finish or timeout
  if ((await timeout(timeoutVal * 1.5, container.wait())) === "timeout") {
    await removeContainer(container);
    throw new TimeoutError("Container took to long.");
  }

  if (!resultIsFolder) {
    // read the resultPath, write to outputPath
    try {
      const stream = (await container.fs.get({ path: resultPath })) as any;
      const output = createWriteStream(exportPath);

      if (
        (await timeout(
          timeoutVal,
          new Promise((resolve) => {
            output.on("finish", resolve);
            stream.pipe(output);
          })
        )) === "timeout"
      ) {
        await removeContainer(container);
        throw new TimeoutError("Reading output file timed out");
      }
    } catch {
      await removeContainer(container);
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

      if (
        (await timeout(
          timeoutVal,
          new Promise((resolve) => {
            output.on("finish", resolve);
            stream.pipe(output);
          })
        )) === "timeout"
      ) {
        await removeContainer(container);
        throw new TimeoutError("Reading output file timed out");
      }
    } catch {
      await removeContainer(container);
      throw new DockerExecError("Could not read resultPath", output);
    }
  }

  await removeContainer(container);
  return;
}
