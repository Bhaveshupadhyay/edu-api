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
	      .bail()
	      .isLength({ min: 6 })
	      .withMessage("Password must be at least 6 characters"),
	    body("cpassword")
	      .notEmpty()
	      .withMessage("Confirm password is required")
	      .bail()
	      .custom((value, { req }) => {
	        if (value !== req.body.password) {
	          throw new Error("Passwords do not match");
	        }
	        return true;
	      }),
	    body('device_id')
		  .optional({ nullable: true })
		  .trim()
		  .isLength({ min: 8, max: 255 })
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[A-Za-z0-9-:_]+$/)
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
		  .optional({ nullable: true })
		  .trim()
		  .isLength({ min: 8, max: 255 })
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[A-Za-z0-9-:_]+$/)
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
	      .bail()
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