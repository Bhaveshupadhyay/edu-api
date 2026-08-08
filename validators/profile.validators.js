import { body, query } from 'express-validator';

const safeStringRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s_\-]+$/;

export const profileValidator = {
  getDetails: [
    query('device_id')
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),
  ],

  updateDetails: [
    body('device_id')
      .trim()
      .notEmpty()
      .withMessage('Oops, something went wrong')
      .isLength({ min: 9, max: 12 })
      .withMessage('Oops, something went wrong')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Oops, something went wrong'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage("Name required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters.")
      .matches(safeStringRegex)
      .withMessage("Name contains invalid characters (only letters, numbers, spaces, _ and - allowed)."),

    body('avatar_url')
      .optional()
      .trim()
      .isLength({ max: 255 }),

    body('bio')
      .optional()
      .trim()
  ]
};
