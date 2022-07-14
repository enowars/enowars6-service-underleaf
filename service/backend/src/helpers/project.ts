import { RequestHandler } from "express";
import { exists } from "./existsAsync";

export function projectIdIsSafe(id: string): boolean {
  return /^[0-9a-fA-F]*$/.test(id);
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
  return "/app/data/projects/" + idToSegmentedPath(id);
}

export function getProjectRemoteGitPath(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "/app/data/git/" + id; //idToSegmentedPath(id);
}

export function getRemoteGitUrl(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "http://nginx-git/" + id; //idToSegmentedPath(id);
}

export async function projectIsSafe(id: string): Promise<boolean> {
  return projectIdIsSafe(id) && exists(getProjectPath(id));
}

export const reqProjectIdIsSafe: RequestHandler = async (req, res, next) => {
  const id = req.params.id || req.body.id;

  if (typeof id === "string" && (await projectIsSafe(id))) {
    next();
    return;
  }
  res.status(400).json({ status: "Project id is invalid" });
};

export function getProjectCompileFolder(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "/app/data/compile/" + id.substring(0, 2);
}

export function getProjectCompilePath(id: string): string {
  throwIfProjectIdIsNotSafe(id);
  return "/app/data/compile/" + idToSegmentedPath(id);
}
