import { Router } from "express";

import { 
  signIn, 
  signUp, 
  sendOTP, 
  signInAdmin,
  sendVerificationEmailController,
  verifyEmailController
} from "../controllers/auth.controllers.js";

import { registerValidator, loginValidator, otpValidator } from '../validators/auth.validators.js';
import { emailVerificationValidator } from '../validators/verify.validators.js';
import verifyEmailMiddleware from "../middleware/verifyEmail.middleware.js";

const authRouter = Router();

authRouter.post(
	"/sign-in", 
	loginValidator.create,
    signIn
);

authRouter.post(
	"/sign-up",
	registerValidator.create,
	signUp
);

authRouter.post(
	"/send", 
	otpValidator.sendOTP,
	sendOTP
);

authRouter.post(
	"/send-verification-email", 
	emailVerificationValidator.sendVerification, 
	sendVerificationEmailController
);

// authRouter.post(
// 	"/send-verification", 
// 	emailVerificationValidator.sendVerification, 
// 	sendVerificationEmailController
// );

authRouter.get(
	"/verify-email", 
	verifyEmailMiddleware, 
	verifyEmailController
);

// authRouter.post(
// 	"/verify-email", 
// 	verifyEmailMiddleware, 
// 	verifyEmailController
// );

authRouter.post(
	"/admin/signin", 
	loginValidator.admin,
	signInAdmin
);

export default authRouter;