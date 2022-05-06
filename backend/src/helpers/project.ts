import { RequestHandler } from "express";
import { existsSync } from "fs";

export function projectIdIsSafe(id: string): boolean {
  return /^[0-9a-fA-F]+$/.test(id);
}

function idToSegmentedPath(id: string): string {
  return `${id.substring(0, 2)}/${id}`;
}

function throwIfProjectIdIsNotSafe(id: string): void {
  if (!projectIdIsSafe(id)) {
    throw new Error(`Invalid project id: ${id}`);
  }
}

export function getProjectPath(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "./data/projects/" + idToSegmentedPath(id);
}

export function getProjectRemoteGitPath(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "./data/git/" + id; //idToSegmentedPath(id);
}

export function getRemoteGitUrl(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "http://nginx-git/" + id; //idToSegmentedPath(id);
}

export function projectIsSafe(id: string): boolean {
  return projectIdIsSafe(id) && existsSync(getProjectPath(id));
}

export const reqProjectIdIsSafe: RequestHandler = (req, res, next) => {
  const id = req.params.id || req.body.id;

  if (typeof id === "string" && projectIsSafe(id)) {
    next();
    return;
  }
  res.status(400).json({ status: "Project id is invalid" });
};

export function getProjectCompilePath(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return './data/compile/' + idToSegmentedPath(id);
}