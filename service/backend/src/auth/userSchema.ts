import mongoose from "mongoose";
import Project from "../project/projectSchema";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    immutable: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    immutable: true,
    required: true,
  },
});

userSchema.pre("remove", async function () {
  const projects = await Project.find({ owner: this._id });
  for (const project of projects) {
    await project.remove();
  }
});

userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
