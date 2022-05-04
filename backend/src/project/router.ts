import express from "express";
import { reqProjectIdIsSafe } from "../helpers/project";
import { addRemote } from "./addRemote";
import { createProject } from "./create";

export const router = express.Router();

router.get('/create', createProject);

router.post('/remote', [reqProjectIdIsSafe, addRemote]);

export default router;