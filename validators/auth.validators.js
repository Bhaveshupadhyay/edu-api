import { body, param, query } from 'express-validator';

export const registerValidator = {
	create: [
	    body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Please add your email")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail(),
	    body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Please add your password")
	      .bail()
	      .isLength({ min: 6 })
	      .withMessage("Password must be at least 6 characters")
	      .bail()
	      .matches(/^[^<>]*$/)
	      .withMessage("Invalid password"),
	    body("cpassword")
	      .notEmpty()
	      .withMessage("Please re-enter your password")
	      .bail()
	      .matches(/^[^<>]*$/)
	      .withMessage("Invalid password")
	      .bail()
	      .custom((value, { req }) => {
	        if (value !== req.body.password) {
	          throw new Error("Passwords do not match");
	        }
	        return true;
	      }),
	    body('device_id')
		  .custom((value, { req }) => {
		    const type = req.body.device_type || 'web';
		    if (['android', 'ios'].includes(type)) {
		      if (!value || (typeof value === 'string' && !value.trim())) {
		        throw new Error('Device ID is required for android and ios devices');
		      }
		    }
		    return true;
		  })
		  .bail()
		  .if((value) => value !== undefined && value !== null && value !== '')
		  .trim()
		  .isLength({ min: 8, max: 255 })
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[^<>]*$/)
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[A-Za-z0-9-:_]+$/)
		  .withMessage('Invalid Device ID'),
		body("device_type")
			.optional({ nullable: true, checkFalsy: true })
			.trim()
			.isIn(['android', 'ios', 'web'])
			.withMessage("Invalid device type")
			.bail()
			.matches(/^[^<>]*$/)
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
	      .withMessage("Password required")
	      .bail()
	      .matches(/^[^<>]*$/)
	      .withMessage("Invalid password"),
	    body('device_id')
		  .custom((value, { req }) => {
		    const type = req.body.device_type || req.body.deviceType || 'web';
		    if (['android', 'ios'].includes(type)) {
		      if (!value || (typeof value === 'string' && !value.trim())) {
		        throw new Error('Device ID is required for android and ios devices');
		      }
		    }
		    return true;
		  })
		  .bail()
		  .if((value) => value !== undefined && value !== null && value !== '')
		  .trim()
		  .isLength({ min: 8, max: 255 })
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[^<>]*$/)
		  .withMessage('Invalid Device ID')
		  .bail()
		  .matches(/^[A-Za-z0-9-:_]+$/)
		  .withMessage('Invalid Device ID'),
		body("device_type")
			.optional({ nullable: true, checkFalsy: true })
			.trim()
			.isIn(['android', 'ios', 'web'])
			.withMessage("Invalid device type")
			.bail()
			.matches(/^[^<>]*$/)
			.withMessage("Invalid device type")
	],

	admin: [
		body("email")
	      .trim()
	      .notEmpty()
	      .withMessage("Please add your email")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail(),
	  body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Please add your password")
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
	      .withMessage("Please add your email")
	      .bail()
		  .isEmail()
		  .withMessage("Invalid email")
		  .normalizeEmail()
	]
};