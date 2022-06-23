import { Docker } from "node-docker-api";
import { latexDockerImage } from "../latex/constats";
import { promises as fs } from "fs";
import { join } from "path";
import { promises as dns } from "dns";
import { gitImage } from "./git";

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
    host: (await dns.lookup("dind")).address, // yes this is needed, the ca valid for the host 'dind'
    port: 2376,
    ca: await fs.readFile(join(certPath, "ca.pem")),
    cert: await fs.readFile(join(certPath, "cert.pem")),
    key: await fs.readFile(join(certPath, "key.pem")),
  });

  Object.assign(_docker, __docker);

  // dind takes some time to boot up, so we wait a bit
  const requiredImages = [
    // both images Dockerfiles can be found in ../../../dockerimages
    { name: latexDockerImage, tag: "latest" },
    { name: gitImage, tag: "latest" },
  ];

  for (const requiredImage of requiredImages) {
    _docker.image
      .create({}, { fromImage: requiredImage.name, tag: requiredImage.tag })
      .then((stream) => promisifyStream(stream));
  }
}, 100);

export const docker = _docker;
