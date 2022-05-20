import mongoose from "mongoose";

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

const Project = mongoose.model("Project", projectSchema);

export default Project;
