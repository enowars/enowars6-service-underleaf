import User from "../auth/userSchema";
import Project from "./projectSchema";

export async function canModifyProject(username: string, id: string) {
  const user = await User.findOne({ username });
  const proj = await Project.findOne({ id });

  if (user === null || proj === null) {
    return false;
  }

  if (user.id === proj.owner.toString()) {
    return true;
  }
  return false;
}

export async function canModifyProjectByRequest(req: any, id: string) {
  return await canModifyProject(req.body.auth.username, id);
}
