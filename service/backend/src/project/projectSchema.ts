import mongoose from "mongoose";
import { promises } from "fs";
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
    await promises.rm(getProjectRemoteGitPath(id), { recursive: true });
  } catch (e) {}
  // remove the local files
  try {
    await promises.rm(getProjectPath(id), { recursive: true });
  } catch (e) {}
  // remove the output
  try {
    await promises.rm(getProjectCompilePath(id) + ".pdf", { recursive: true });
  } catch (e) {}
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
