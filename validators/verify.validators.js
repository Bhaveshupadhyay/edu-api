import { body } from 'express-validator';

export const otpValidator = {
	verifyOTP: [
		body("token")
			.trim()
			.notEmpty()
			.withMessage("OTP required")
			.matches(/^[^<>]*$/)
			.withMessage("Invalid OTP"),
		body("otp")
			.trim()
			.notEmpty()
			.withMessage("OTP required")
			.matches(/^[^<>]*$/)
			.withMessage("Invalid OTP"),
	]
  
	// websiteLink: [
	// 	body("token")
	// 		.trim()
	// 		.notEmpty()
	// 		.withMessage("OTP required")
	// 		.matches(/^[^<>]*$/)
	// 		.withMessage("Invalid OTP"),
	// ]
}