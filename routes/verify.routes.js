import { Router } from "express";

import { verifyOTP } from "../controllers/verify.controllers.js";
import { verifyEmailController, sendVerificationEmailController } from "../controllers/auth.controllers.js";
import { otpValidator, emailVerificationValidator } from "../validators/verify.validators.js";
import verifyEmailMiddleware from "../middleware/verifyEmail.middleware.js";

const verifyRouter = Router();

verifyRouter.post("/verify", otpValidator.verifyOTP, verifyOTP);
verifyRouter.get("/verify-email", verifyEmailMiddleware, verifyEmailController);
verifyRouter.post("/verify-email", verifyEmailMiddleware, verifyEmailController);
verifyRouter.post("/send-verification", emailVerificationValidator.sendVerification, sendVerificationEmailController);

export default verifyRouter;