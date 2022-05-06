import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { createProject } from "./create";
import { listProjects } from "./listProjects";

export const router = express.Router();

router.use(loggedIn);
router.post("/create", createProject);
router.get("/list", listProjects);

export default router;
