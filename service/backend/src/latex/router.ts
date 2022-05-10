import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { reqProjectIdIsSafe } from "../helpers/project";
import { modifyNeeded } from "../project/modifyNeeded";
import { compileProject } from "./compile";
import { getOutput } from "./getOutput";
export const router = express.Router();

const checks = [loggedIn, reqProjectIdIsSafe, modifyNeeded];

router.post("/compile/:id/", checks, compileProject);
router.get("/output/:id/", checks, getOutput);

export default router;
