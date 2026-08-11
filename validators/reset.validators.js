import { body, param } from 'express-validator';

export const passwordValidator = {
	resetPassword: [
		body("password")
	      .trim()
	      .notEmpty()
	      .withMessage("Password required")
	      .bail()
	      .matches(/^[^<>]*$/)
	      .withMessage("Invalid password"),
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
	]
}