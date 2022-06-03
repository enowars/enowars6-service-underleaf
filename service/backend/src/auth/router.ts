import express from "express";
import { httpBasic } from "./httpBasic";
import { register } from "./register";
import { login } from "./login";
import { deleteAccount } from "./delete";
import { loggedIn } from "./loggedIn";

export const router = express.Router();

router.get("/basic", httpBasic);
router.post("/register", register);
router.post("/login", login);
router.get("/delete", [loggedIn, deleteAccount]);

export default router;
