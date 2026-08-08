import { Router } from "express";

import { verifyOTP } from "../controllers/verify.controllers.js";

import { otpValidator } from "../validators/verify.validators.js";

const verifyRouter = Router();

verifyRouter.post("/verify", otpValidator.verifyOTP, verifyOTP);

export default verifyRouter;