import { docker } from "../helpers/dockerConnection";

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
  hostReadPath: string,
  containerReadPath: string,
  containerOutputpath: string,
  hostOutputPath: string,
  timeoutVal: number
): Promise<void> {
  if (!containerOutputpath.startsWith("/")) {
    throw new Error("resultPath needs to be absolute.");
  }

  // create the container
  // we do not need to await this yet, as we need to prepare a tar too
  const container = await docker.createContainer(
    image,
    workingDir,
    command,
    "1000:1000",
    "none",
    [
      {
        hostPath: hostOutputPath,
        containerPath: containerOutputpath,
        flag: "rw",
      },
      { hostPath: hostReadPath, containerPath: containerReadPath, flag: "ro" },
    ]
  );

  // start the container and read the logs
  await container.start();

  // wait for container to finish or timeout
  if ((await timeout(timeoutVal * 1.5, container.wait())) === "timeout") {
    container.remove(); // no need to wait for this to complete
    throw new TimeoutError("Container took to long.");
  }

  container.remove(); // no need to wait for this to complete
  return;
}
