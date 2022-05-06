import express from "express";
import bodyParser from "express";
import fileUpload from "express-fileupload";

import filesRouter from "../files/router";
import projectRouter from "../project/router";
import gitRouter from "../git/router";
import authRouter from "../auth/router";

const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use("/files", filesRouter);
app.use("/project", projectRouter);
app.use("/git", gitRouter);

app.use("/auth", authRouter);

export default app;
