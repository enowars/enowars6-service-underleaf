import { Docker } from "node-docker-api";
import { latexDockerImage } from "./constats";

const _docker = new Docker({ host: "dind" });

const promisifyStream = (stream: any) =>
  new Promise((resolve, reject) => {
    stream.on("data", (d: any) => console.log("[DOCKER]", d.toString()));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

setTimeout(() => {
  // dind takes some time to boot up, so we wait a bit
  const requiredImages = [{ name: "alpine", tag: "latest" }, {name: latexDockerImage, tag: 'latest'}, {name: 'hllm/latexindent', tag: 'latest'}];

  for (const requiredImage of requiredImages) {
    _docker.image
      .create({}, { fromImage: requiredImage.name, tag: requiredImage.tag })
      .then((stream) => promisifyStream(stream));
  }
}, 1000);

export const docker = _docker;
