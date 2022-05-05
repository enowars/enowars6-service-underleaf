import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { createProject } from "./create";

export const router = express.Router();

router.use(loggedIn);
router.get('/create', createProject);

export default router;