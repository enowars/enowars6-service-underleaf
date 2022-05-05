import express from "express";
import { loggedIn } from "../auth/loggedIn";
import { reqProjectIdIsSafe } from "../helpers/project";
import { modifyNeeded } from "../project/modifyNeeded";
import { pushProject } from "./push";

export const router = express.Router();

router.use(loggedIn, reqProjectIdIsSafe, modifyNeeded);

router.get('/push/:id/', pushProject);
router.get('/pull/:id/', pushProject);

export default router;