import { latexDockerImage } from "../latex/constats";
import { promises as fs } from "fs";
import { join } from "path";
import { promises as dns } from "dns";
import { gitImage } from "./git";
import { Modem } from "./docker";

if (typeof process.env.DOCKER_CERT_PATH === "undefined") {
  throw Error("DOCKER_CERT_PATH is not defined");
}

const certPath = process.env.DOCKER_CERT_PATH;
export let docker: Modem = undefined as any;

export async function initDocker(){
  const host = (await dns.lookup("dind")).address;
  const url = `https://${host}:2376`;

  docker = new Modem(url,
    await fs.readFile(join(certPath, "ca.pem")),
    await fs.readFile(join(certPath, "cert.pem")),
    await fs.readFile(join(certPath, "key.pem"))
  );

  const requiredImages = [
    // both images Dockerfiles can be found in ../../../dockerimages
    { name: latexDockerImage, tag: "latest" },
    { name: gitImage, tag: "latest" },
  ];

  for (const image of requiredImages) {
    docker.pullImage(image.name, image.tag).then(()=>{console.log("[DOCKER]", `pulled ${image.name}:${image.tag}`)});
  }
}