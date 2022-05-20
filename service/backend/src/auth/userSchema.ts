import mongoose from "mongoose";

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

userSchema.pre("remove", function (next) {
  this.model("Project").deleteMany({ owner: this._id }, next);
});

const User = mongoose.model("User", userSchema);

export default User;
