import shellescape from "shell-escape";
import { exec } from "child_process";
import { promises as fs } from "fs";
import { resolve } from "path";
import { execInDocker } from "./execInDocker";

export const gitImage = "hllm/git"
const timeout = 1500;

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

async function runGitCommandInContainer(path: string, command: Array<string>){
  return await execInDocker(
    gitImage,
    command,
    "/data",
    path,
    'data/',
    '/data',
    path,
    timeout,
    true
  );
}

export async function gitSetupProject(
  localPath: string,
  remotePath: string,
  gitUrl: string
) {
  // copy default document over
    await fs.writeFile(
      resolve(localPath, "main.tex"),
      `\\documentclass[12pt]{minimal}
  \\usepackage[utf8]{inputenc}
      
  \\begin{document}
    \\begin{center}
      \\LaTeX is \\textit{sus}!
    \\end{center}
  \\end{document}`
    );

  // configure 'remote' git
  await runGitCommandInContainer(remotePath, ["git", "init", "--bare"])

  // configure 'local' git
  await runGitCommandInContainer(localPath, ["sh", "-c", `
  git init . &&
  git config user.name underleaf &&
  git config user.email underleaf@example.com &&
  git remote add origin ${gitUrl} &&
  git add . &&
  git commit -m "Initial commit" &&
  git push -f origin master
  `]);
}

export async function gitCommit(path: string, message: string) {
  return await runGitCommandInContainer(path, ["sh", "-c", `git add . && git commit -m ${escapeString(message)}`])
}

export async function gitPush(path: string) {
  return await runGitCommandInContainer(path, ["git", "push", "-f", "origin", "master"])
}

export async function gitPull(path: string) {
  return await runGitCommandInContainer(path, ["sh", "-c", "git fetch origin && git reset --hard origin/master"])
}