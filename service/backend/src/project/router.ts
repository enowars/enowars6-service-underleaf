import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { createProject } from "./create";
import { listProjects } from "./listProjects";
import { deleteProject } from "./deleteProject";

export const router = express.Router();

router.use(loggedIn);
router.post("/create", createProject);
router.get("/list", listProjects);
router.post("/delete", deleteProject);

export default router;
