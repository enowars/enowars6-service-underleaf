import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { reqProjectIdIsSafe } from "../helpers/project";
import { modifyNeeded } from "../project/modifyNeeded";
import { compileProject } from "./compile";
export const router = express.Router();

const checks = [loggedIn, reqProjectIdIsSafe, modifyNeeded];

router.post("/compile/:id/", checks, compileProject);

export default router;
