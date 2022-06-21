import express from "express";
import { httpBasic } from "./httpBasic";
import { register } from "./register";
import { login } from "./login";

export const router = express.Router();

router.get("/basic", httpBasic);
router.post("/register", register);
router.post("/login", login);

export default router;
