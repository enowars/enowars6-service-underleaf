import shellescape from "shell-escape";
import { exec } from "child_process";
import { promises as fs } from "fs";
import { resolve } from "path";

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
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new AsyncExecError(error, stdout, stderr));
      } else {
        resolve({});
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

export async function gitSetupProject(
  localPath: string,
  remotePath: string,
  gitUrl: string
) {
  // configure 'local' git
  await gitInit(localPath);
  await gitConfigName(localPath);
  await gitConfigEmail(localPath);
  await gitAddRemote(localPath, gitUrl);

  // copy default document over
  await fs.writeFile(
    resolve(localPath, "main.tex"),
    `\\documentclass[12pt]{minimal}
\\usepackage[utf8]{inputenc}
    
\\begin{document}
  \\begin{center}
    \\LaTeX{} is \\textit{sus}!
  \\end{center}
\\end{document}`
  );

  await gitCommit(localPath, "Initial commit");

  // configure 'remote' git
  await gitInitBare(remotePath);

  await gitPush(localPath);
}

export async function gitAddRemote(path: string, url: string) {
  const rpath = resolve(path);
  return asyncExec(
    `git -C ${escapeString(rpath)} remote add origin ${escapeString(url)}`
  );
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
    `cd ${escapeString(path)}; git fetch origin && git reset --hard origin/master`
  );
}