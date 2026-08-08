import { body, param, query } from 'express-validator';

export const registerValidator = {
	create: [
	    body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Email Address required")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail(),
	    body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Password required")
	      .isLength({ min: 6 })
	      .withMessage("Password must be at least 6 characters"),
	    body("cpassword")
	      .notEmpty()
	      .withMessage("Confirm password is required")
	      .custom((value, { req }) => {
	        if (value !== req.body.password) {
	          throw new Error("Passwords do not match");
	        }
	        return true;
	      }),
	    body('device_id')
		  .trim()
		  .notEmpty()
		  .withMessage('Device ID is required.')
		  .isLength({ min: 9, max: 12 })
		  .withMessage('Invalid Device ID')
		  .matches(/^[A-Za-z0-9-]+$/)
		  .withMessage('Invalid Device ID'),
		body("deviceType")
			.optional()
			.isIn(['android', 'ios', 'web', 'tv'])
			.withMessage("Invalid device type")
  	]
};

export const loginValidator = {
	create: [
		body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Email Address required")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail(),
	    body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Password required"),
	    body('device_id')
		  .trim()
		  .notEmpty()
		  .withMessage('Device ID is required.')
		  .isLength({ min: 9, max: 12 })
		  .withMessage('Invalid Device ID')
		  .matches(/^[A-Za-z0-9-]+$/)
		  .withMessage('Invalid Device ID'),
		body("deviceType")
			.optional()
			.isIn(['android', 'ios', 'web', 'tv'])
			.withMessage("Invalid device type")
	],

	admin: [
		body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Email Address required")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail(),
	  body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Password required")
	      .matches(/^[^<>]*$/)
	      .withMessage("Invalid password")
	]
};

export const otpValidator = {
	sendOTP: [
	    body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Email Address required")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail()
	]
};