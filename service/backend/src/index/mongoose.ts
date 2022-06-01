import mongoose from "mongoose";

const username = encodeURIComponent(
  process.env["MONGO_INITDB_ROOT_USERNAME"] || ""
);
const passowrd = encodeURIComponent(
  process.env["MONGO_INITDB_ROOT_PASSWORD"] || ""
);

export const connection = mongoose.connect(
  `mongodb://${username}:${passowrd}@db`
);
