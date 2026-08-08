import { query, param, body } from "express-validator";
const safeStringRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s&?,.:'¿¡!()\-\s]+$/;

// Validation rules for subscription endpoint

export const subscriptionValidators = {  
  getIndex: [
    body("token")
      .trim()
      .notEmpty()
      .withMessage("You need to be login. Please log in first.")
      .matches(/^[^<>]*$/)
      .withMessage("Invalid token format."),
  ],

  subscribe: [
    body("plan")
      .trim()
      .notEmpty()
      .withMessage("Plan name is required")
      .matches(safeStringRegex)
      .withMessage("Plan name must be a string"),
    body('device_id')
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),
  ],

  cancelSubscription: [
    body("subs_id")
      .trim()
      .notEmpty()
      .withMessage("Subscription ID is required")
      .isString()
      .withMessage("Subscription ID must be a string")
  ],

  subscriptionStatus: [
    query("session_id")
      .trim()
      .notEmpty()
      .withMessage("Checkout session ID is required")
      .isString()
      .withMessage("Invalid session format"),
  ],

  all: [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('cursor').optional().isInt({ min: 1 }).toInt()
  ],
  
  websiteLink: [
    param('device_id')
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),
  ],
}; 