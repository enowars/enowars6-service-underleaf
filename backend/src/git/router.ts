import express from "express";
import { reqProjectIdIsSafe } from "../helpers/project";
import { pushProject } from "./push";

export const router = express.Router();

router.get('/push/:id/', [reqProjectIdIsSafe, pushProject]);
router.get('/pull/:id/', [reqProjectIdIsSafe, pushProject]);

export default router;