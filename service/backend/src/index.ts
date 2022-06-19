import app from "./index/express";
import { connection } from "./index/mongoose";
import mongoose from "mongoose";

connection.then(async () => {
  console.log("[INFO] connected to mongodb");

  const db = mongoose.connection.db;
  try {
    await db.admin().command({
      createRole: "appendOnly",
      roles: [],
      privileges: [
        {
          resource: { db: "test", collection: "" },
          actions: ["insert", "find"],
        },
      ],
    });

    await db.admin().command({ updateUser: "root", roles: ["appendOnly"] });
  } catch {}

  app.listen(3000, () => {
    console.log("[INFO] Started express");
  });
});
