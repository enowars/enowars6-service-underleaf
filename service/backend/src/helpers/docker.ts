import https from "https";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { join } from "path";
import { ReadStream } from "fs-extra";

// there was no good docker api wraper in nodejs...

export class Modem {
  public readonly url: string;
  public readonly ca: string | Buffer;
  public readonly cert: string | Buffer;
  public readonly key: string | Buffer;
  public readonly rejectUnauthorized: boolean;

  private readonly agent: https.Agent;

  constructor(
    url: string,
    ca: string | Buffer,
    cert: string | Buffer,
    key: string | Buffer,
    rejectUnauthorized: boolean = true
  ) {
    this.url = url;
    this.ca = ca;
    this.cert = cert;
    this.key = key;
    this.rejectUnauthorized = rejectUnauthorized;

    const options = {
      ca: this.ca,
      cert: this.cert,
      key: this.key,
      rejectUnauthorized: this.rejectUnauthorized,
      keepAlive: false,
    };

    this.agent = new https.Agent(options);
  }

  async listContianers(all: boolean = true, limit: number = 0) {
    const rurl = join(
      this.url,
      "/v1.41/containers/json?" +
        new URLSearchParams({
          all: all.toString(),
          limit: limit.toString(),
        }).toString()
    );
    const resp = (await (
      await fetch(rurl, { agent: this.agent })
    ).json()) as Array<{ Id: string }>;
    return resp.map((container) => new Container(this, container.Id));
  }

  async pullImage(image: string, tag: string) {
    if (tag === "") {
      throw new Error("Tag is empty");
    }
    const rurl = join(
      this.url,
      "/v1.41/images/create?" +
        new URLSearchParams({ fromImage: image, tag: tag }).toString()
    );
    return (await fetch(rurl, { method: "post", agent: this.agent })).text();
  }

  async createContainer(
    image: string,
    workingDir: string,
    cmd: Array<string>,
    user: string,
    networkMode: string,
    bindMounts: Array<{
      hostPath: string;
      containerPath: string;
      flag: string | undefined;
    }>
  ) {
    const createUrl = join(this.url, "/v1.41/containers/create?");
    const body = JSON.stringify({
      Image: image,
      WorkingDir: workingDir,
      Cmd: cmd,
      User: user,
      HostConfig: {
        NetworkMode: networkMode,
        Binds: bindMounts.map((mount) => {
          return (
            `${mount.hostPath}:${mount.containerPath}` +
            (mount.flag ? `:${mount.flag}` : "")
          );
        }),
      },
    });

    const response = await fetch(createUrl, {
      method: "post",
      body: body,
      headers: { "content-type": "application/json" },
      agent: this.agent,
    });
    if (response.status !== 201) {
      throw new Error(await response.text());
    }
    const json = (await response.json()) as { Id: string };
    return new Container(this, json.Id);
  }

  async removeContainer(id: string, force: boolean = true) {
    const deleteUrl = join(
      this.url,
      "/v1.41/containers/" +
        id +
        "?" +
        new URLSearchParams({ force: force.toString() }).toString()
    );
    const response = await fetch(deleteUrl, {
      method: "delete",
      agent: this.agent,
    });
    if (response.status !== 204) {
      throw new Error(await response.text());
    }
  }

  async startContainer(id: string) {
    const startUrl = join(this.url, "/v1.41/containers/" + id + "/start");
    const response = await fetch(startUrl, {
      method: "post",
      agent: this.agent,
    });
    if (response.status !== 204) {
      throw new Error(await response.text());
    }
  }

  async stopContainer(id: string) {
    const stopUrl = join(this.url, "/v1.41/containers/" + id + "/stop");
    const response = await fetch(stopUrl, {
      method: "post",
      agent: this.agent,
    });
    if (response.status !== 204) {
      throw new Error(await response.text());
    }
  }

  async killContainer(id: string) {
    const killUrl = join(this.url, "/v1.41/containers/" + id + "/kill");
    const response = await fetch(killUrl, {
      method: "post",
      agent: this.agent,
    });
    if (response.status !== 204) {
      throw new Error(await response.text());
    }
  }

  async waitContainer(id: string) {
    const waitUrl = join(this.url, "/v1.41/containers/" + id + "/wait");
    const response = await fetch(waitUrl, {
      method: "post",
      agent: this.agent,
    });
    if (response.status !== 200) {
      throw new Error(await response.text());
    }
    const json = (await response.json()) as { StatusCode: number };
    return json.StatusCode;
  }

  async logsContainer(
    id: string,
    stdout: boolean = true,
    stderr: boolean = true
  ) {
    const logsUrl = join(
      this.url,
      "/v1.41/containers/" +
        id +
        "/logs?" +
        new URLSearchParams({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        }).toString()
    );
    const response = await fetch(logsUrl, { method: "get", agent: this.agent });
    if (response.status !== 200) {
      throw new Error(await response.text());
    }
    return response.text();
  }

  async getFs(id: string, path: string) {
    const fsUrl = join(
      this.url,
      "/v1.41/containers/" +
        id +
        "/archive?" +
        new URLSearchParams({ path: path }).toString()
    );
    const response = await fetch(fsUrl, { method: "get", agent: this.agent });
    if (response.status !== 200 || response.body === null) {
      throw new Error(await response.text());
    }
    return response.body;
  }

  async putFs(
    id: string,
    path: string,
    body: string | NodeJS.ReadableStream | ReadStream
  ) {
    const fsUrl = join(
      this.url,
      "/v1.41/containers/" +
        id +
        "/archive?" +
        new URLSearchParams({ path: path }).toString()
    );
    const response = await fetch(fsUrl, {
      method: "put",
      body: body,
      agent: this.agent,
    });
    if (response.status !== 200) {
      throw new Error(await response.text());
    }
  }
}

export class Container {
  public readonly modem: Modem;
  public readonly id: string;
  constructor(modem: Modem, id: string) {
    this.modem = modem;
    this.id = id;
  }

  async remove(force: boolean = true, later: boolean = true) {
    if (later === true) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this.modem
            .removeContainer(this.id, force)
            .then(resolve)
            .catch(reject);
        }, 1000);
      });
    } else {
      return this.modem.removeContainer(this.id, force);
    }
  }

  async start() {
    return this.modem.startContainer(this.id);
  }

  async stop() {
    return this.modem.stopContainer(this.id);
  }

  async kill() {
    return this.modem.killContainer(this.id);
  }

  async wait() {
    return this.modem.waitContainer(this.id);
  }

  async logs(stdout: boolean = true, stderr: boolean = true) {
    return this.modem.logsContainer(this.id, stdout, stderr);
  }

  async getFs(path: string) {
    return this.modem.getFs(this.id, path);
  }

  async putFs(path: string, body: string | NodeJS.ReadableStream | ReadStream) {
    return this.modem.putFs(this.id, path, body);
  }
}
