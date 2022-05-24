import { Docker } from "node-docker-api";
import { latexDockerImage } from "./constats";
import { readFileSync } from "fs";
import { join } from "path";
import { promises } from "dns";

if (typeof process.env.DOCKER_CERT_PATH === "undefined") {
  throw Error("DOCKER_CERT_PATH is not defined");
}

const certPath = process.env.DOCKER_CERT_PATH;

let _docker: Docker = {} as any;

const promisifyStream = (stream: any) =>
  new Promise((resolve, reject) => {
    stream.on("data", (d: any) => console.log("[DOCKER]", d.toString()));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

setTimeout(async () => {
  const __docker = new Docker({
    protocol: "https",
    host: (await promises.lookup("dind")).address, // yes this is needed, the ca valid for the host 'dind'
    port: 2376,
    ca: readFileSync(join(certPath, "ca.pem")),
    cert: readFileSync(join(certPath, "cert.pem")),
    key: readFileSync(join(certPath, "key.pem")),
  });

  Object.assign(_docker, __docker);

  // dind takes some time to boot up, so we wait a bit
  const requiredImages = [{ name: latexDockerImage, tag: "latest" }];

  for (const requiredImage of requiredImages) {
    _docker.image
      .create({}, { fromImage: requiredImage.name, tag: requiredImage.tag })
      .then((stream) => promisifyStream(stream));
  }
}, 1000);

export const docker = _docker;
