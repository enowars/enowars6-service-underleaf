import shellescape from "shell-escape";
import { exec } from "child_process";
import { promises as fs } from "fs";
import { copy } from "fs-extra";
import { resolve } from "path";

import { Mutex } from "async-mutex";
import { exists } from "./existsAsync";

export const gitImage = "hllm/git";

class AsyncExecError extends Error {
  stdout: string;
  stderr: string;
  constructor(inner: Error, stdout: string, stderr: string) {
    super();
    this.message = inner.message;
    this.stack = inner.stack;
    this.name = inner.name;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

function escapeString(input: string): string {
  return shellescape([input]);
}

export function asyncExec(command: string) {
  return new Promise<void>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new AsyncExecError(error, stdout, stderr));
      } else {
        resolve();
      }
    });
  });
}

export function gitInit(path: string) {
  return asyncExec(`git init ${path}`);
}

export function gitConfigName(path: string) {
  const rpath = resolve(path);
  return asyncExec(`git -C ${escapeString(rpath)} config user.name underleaf`);
}

export function gitConfigEmail(path: string) {
  const rpath = resolve(path);
  return asyncExec(
    `git -C ${escapeString(rpath)} config user.email underleaf@example.com`
  );
}

function gitInitBare(path: string) {
  return asyncExec(`git init --bare ${escapeString(path)}`);
}

let templatesKnownToBeCreated = false;
const createTemplateMutex = new Mutex();
export async function gitSetupProject(
  localPath: string,
  remotePath: string,
  gitUrl: string
) {
  if (!templatesKnownToBeCreated) {
    await createTemplateMutex.runExclusive(async () => {
      if (!templatesKnownToBeCreated && !(await exists(localTemplate))) {
        console.log("[+] creating project templates");
        await gitSetupTemplates();
      }

      templatesKnownToBeCreated = true;
    });
  }

  // copy over the templates
  await Promise.all([
    copy(localTemplate, localPath),
    copy(remoteTemplate, remotePath),
  ]);
  // update the git url
  await fs.appendFile(
    localPath + "/.git/config",
    `[remote "origin"]\n\turl = ${gitUrl}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`
  );
}

const localTemplate = "/app/data/templates/local";
const remoteTemplate = "/app/data/templates/remote";

export async function gitSetupTemplates() {
  await Promise.all([fs.mkdir(localTemplate), fs.mkdir(remoteTemplate)]);

  // configure 'remote' git
  const remoteProm = gitInitBare(remoteTemplate);

  // copy default document over

  const writeProm = fs.writeFile(
    resolve(localTemplate, "main.tex"),
    `\\documentclass[12pt]{minimal}
  \\usepackage[utf8]{inputenc}
      
  \\begin{document}
    \\begin{center}
      \\LaTeX{} is \\textit{sus}!
    \\end{center}
  \\end{document}`
  );

  // configure 'local' git
  await gitInit(localTemplate);
  // the following commands need to be run sequentaly, or they may fail.
  await gitConfigName(localTemplate);
  await gitConfigEmail(localTemplate);

  await writeProm;
  await gitCommit(localTemplate, "Initial commit");

  await remoteProm;

  await gitAddRemote(localTemplate, remoteTemplate);

  await gitPush(localTemplate);

  await gitRemoveRemote(localTemplate);
}

export async function gitAddRemote(path: string, url: string) {
  const rpath = resolve(path);
  return asyncExec(
    `git -C ${escapeString(rpath)} remote add origin ${escapeString(url)}`
  );
}

export async function gitRemoveRemote(path: string) {
  const rpath = resolve(path);
  return asyncExec(`git -C ${escapeString(rpath)} remote remove origin`);
}

export async function gitCommit(path: string, message: string) {
  const rpath = resolve(path);
  await asyncExec(`git -C ${rpath} add .`);
  try {
    await asyncExec(
      `git -C ${escapeString(rpath)} commit -m ${escapeString(message)}`
    );
  } catch (e) {
    if (e instanceof AsyncExecError) {
      if (e.stdout.includes("nothing to commit")) {
        return;
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }
}

export async function gitPush(path: string) {
  return await asyncExec(
    `cd ${escapeString(path)}; git push -f origin master 1>&2`
  );
}

export async function gitPull(path: string) {
  return await asyncExec(
    `cd ${escapeString(
      path
    )}; git fetch origin && git reset --hard origin/master`
  );
}
