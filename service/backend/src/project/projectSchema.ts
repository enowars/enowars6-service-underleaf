import mongoose from "mongoose";
import { promises as fs } from "fs";
import {
  getProjectCompilePath,
  getProjectPath,
  getProjectRemoteGitPath,
} from "../helpers/project";

const projectSchema = new mongoose.Schema({
  id: {
    type: String,
    immutable: true,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    immutable: true,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    immutable: true,
    required: true,
  },
});

projectSchema.pre("remove", async function () {
  const id = this.id;
  // the git repo
  try {
    await fs.rm(getProjectRemoteGitPath(id), { recursive: true });
  } catch (e) {}
  // remove the local files
  try {
    await fs.rm(getProjectPath(id), { recursive: true });
  } catch (e) {}
  // remove the output
  try {
    await fs.rm(getProjectCompilePath(id) + ".pdf", { recursive: true });
  } catch (e) {}
});

projectSchema.index({id: 1}, {unique: true});
projectSchema.index({owner: 1}, {unique: false});

const Project = mongoose.model("Project", projectSchema);

export default Project;
