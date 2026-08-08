import { body } from 'express-validator';

export const deviceValidator = {
  delete: [
    body("current_device_id")
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),

    body('device_id')
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),
  ]
};
