import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { reqProjectIdIsSafe } from "../helpers/project";
import { modifyNeeded } from "../project/modifyNeeded";
import { commitProject } from "./commit";
import { pullProject } from "./pull";
import { pushProject } from "./push";

export const router = express.Router();

const checks = [loggedIn, reqProjectIdIsSafe, modifyNeeded];

router.get("/push/:id/", checks, pushProject);
router.get("/pull/:id/", checks, pullProject);
router.post("/commit/:id/", checks, commitProject);

export default router;
