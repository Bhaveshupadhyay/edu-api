import {body, query, param} from 'express-validator';
import { CategoryType } from '../utils/categoryType.js';

const safeStringRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s_\-]+$/;

export const userValidator = {
  searchData: [
    query("term")
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .matches(safeStringRegex)
      .withMessage("Invalid search term"),
    query("year").optional().isNumeric().withMessage("Year must be numeric"),
    query("month").optional().isNumeric().withMessage("Month must be numeric"),
    query("page_items").optional().isInt().withMessage("Items must be a number"),
    query("pgNo").optional().isInt().withMessage("Page must be a number")
  ],

  getHomeData: [
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("cursor").optional().isInt({ min: 0 }).toInt()
  ],

  getNavPillById: [
    param("nav_pill_id")
      .trim()
      .notEmpty()
      .withMessage("ID is required")
      .isInt({ gt: 0 })
      .withMessage("ID must be a positive number"),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("cursor").optional().isInt({ min: 0 }).toInt()
  ],

  getSectionById: [
    param("section_id")
      .trim()
      .notEmpty()
      .withMessage("ID is required")
      .isInt({ gt: 0 })
      .withMessage("ID must be a positive number"),
    query("category_id")
      .optional()
      .isInt({ gt: 0 })
      .withMessage("ID must be a positive number"),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("cursor").optional().isInt({ min: 0 }).toInt()
  ],

  getModulesLessons: [
    param("module_id")
      .trim()
      .notEmpty()
      .withMessage("Module ID is required")
      .isInt({ gt: 0 })
      .withMessage("Module ID must be a positive number"),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("cursor").optional().isInt({ min: 0 }).toInt(),
    query("syllabus_id").optional().isInt({ gt: 0 }).toInt()
  ],

  getLessonData: [
    param("video_provider_id")
      .trim()
      .notEmpty()
      .withMessage("ID is required")
      .isInt({ gt: 0 })
      .withMessage("ID must be a positive number"),
    param('ui_style')
      .trim()
      .notEmpty()
      .withMessage("UI Style is required")
      .isIn(['horizontal', 'vertical'])
      .withMessage('Invalid UI style')
  ],

  postComment: [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .isLength({ min: 1, max: 1000 })
      .matches(safeStringRegex)
      .withMessage("Invalid characters in comment"),
    body("lesson_id")
      .trim()
      .notEmpty()
      .withMessage("Lesson is required")
      .isInt()
      .withMessage("Lesson must be numeric")
  ],

  commentLikeDislike: [
    body("value")
      .trim()
      .notEmpty()
      .withMessage("Value is required")
      .isInt({ min: 0, max: 5 })
      .withMessage("Invalid value found..."),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .isInt()
      .withMessage("Comment must be numeric")
  ],

  getLessonComments: [
    param("lesson_id")
      .trim()
      .notEmpty()
      .withMessage("Lesson is required")
      .isInt()
      .withMessage("Lesson must be numeric"),
    query("page_items").optional().isInt().withMessage("Items must be a number"),
    query("pgNo").optional().isInt().withMessage("Page must be a number"),
    query("page_items2").optional().isInt().withMessage("Item second must be a number"),
    query("pgNo2").optional().isInt().withMessage("Page second must be a number")
  ],

  postReply: [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Reply is required")
      .isLength({ min: 1, max: 1000 })
      .matches(safeStringRegex)
      .withMessage("Invalid characters in reply"),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .isInt()
      .withMessage("Comment must be numeric")
  ],

  replyLikeDislike: [
    body("value")
      .trim()
      .notEmpty()
      .withMessage("Value is required")
      .isInt({ min: 0, max: 5 })
      .withMessage("Invalid value found..."),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .isInt()
      .withMessage("Comment must be numeric")
  ],

  addToWatchlist: [
    body('device_id')
      .trim()
      .notEmpty()
      .isLength({ min: 9 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage("Device ID format is invalid."),
    
    body('content_id')
      .trim()
      .notEmpty()
      .withMessage("Please select a video to add to your watchlist.")
      .isInt({ gt: 0 })
      .withMessage("This Video doesn't exist. Please check the ID and try again."),
    
    body('content_type')
      .trim()
      .notEmpty()
      .withMessage("Oops! There was an issue with the video. Please try again.")
      .isInt({ gt: 0 })
      .withMessage("Oops! There was an issue with the content type. Please try again.")
      .isIn(Object.keys(CategoryType))
      .withMessage("Oops! There was an issue with the content type. Please try again.")
  ],

  getFromWatchlist: [
    query("device")
      .trim()
      .notEmpty()
      .isLength({ min: 9 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage("Device ID format is invalid."),

    query('pgNo').optional().isInt({min:1}).toInt(),
    query('page_items').optional().isInt({min:1}).toInt(),
  ],

  getContinueWatching: [
    query('device_id')
      .trim()
      .notEmpty()
      .isLength({ min: 9 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage("Device ID format is invalid."),
    query('pgNo').optional().isInt({min:1}).toInt(),
    query('page_items').optional().isInt({min:1}).toInt(),
  ],

  updateContinueWatching: [
    body('device_id')
      .trim()
      .notEmpty()
      .isLength({ min: 9 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage("Device ID format is invalid."),

    body('content_id')
      .trim()
      .notEmpty()
      .withMessage("Content ID is required.")
      .isInt({ gt: 0 })
      .withMessage("Invalid content ID provided."),

    body('content_type')
      .trim()
      .notEmpty()
      .withMessage("Content type is required.")
      .isInt({ gt: 0 })
      .withMessage("Invalid content type provided.")
      .custom(value => {
        const validTypes = Object.keys(CategoryType).map(Number);
        if (!validTypes.includes(Number(value))) {
          throw new Error("Invalid content type provided.");
        }
        return true;
      }),

    body('timing')
      .trim()
      .notEmpty()
      .withMessage("Timing is required.")
      .isFloat({ min: 0 })
      .withMessage("Timing must be a non-negative number.")
  ],
}
