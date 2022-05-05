import express from "express";
import { createProject } from "./create";

export const router = express.Router();

router.get('/create', createProject);

export default router;