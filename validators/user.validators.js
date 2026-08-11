import {body, query, param} from 'express-validator';
import { CategoryType } from '../utils/categoryType.js';

const safeStringRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s_\-]+$/;

export const userValidator = {
  searchData: [
    query("term")
      .optional()
      .trim()
      .isString()
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search term must be between 1 and 100 characters")
      .bail()
      .matches(safeStringRegex)
      .withMessage("Invalid search term"),
    query("year").optional().isInt().withMessage("Year must be numeric"),
    query("month").optional().isInt({ min: 1, max: 12 }).withMessage("Month must be between 1 and 12"),
    query("page_items").optional().isInt({ min: 1 }).withMessage("Items must be a positive number"),
    query("pgNo").optional().isInt({ min: 1 }).withMessage("Page must be a positive number")
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
      .bail()
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
      .bail()
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
      .bail()
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
      .withMessage("Video provider ID is required")
      .bail()
      .isString()
      .withMessage("Invalid video provider ID"),
    param('ui_style')
      .trim()
      .notEmpty()
      .withMessage("UI Style is required")
      .bail()
      .isIn(['horizontal', 'vertical'])
      .withMessage('Invalid UI style')
  ],

  postComment: [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .bail()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment must be between 1 and 1000 characters")
      .bail()
      .matches(safeStringRegex)
      .withMessage("Invalid characters in comment"),
    body("lesson_id")
      .trim()
      .notEmpty()
      .withMessage("Lesson is required")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Lesson must be numeric")
  ],

  commentLikeDislike: [
    body("value")
      .trim()
      .notEmpty()
      .withMessage("Value is required")
      .bail()
      .isInt({ min: 0, max: 5 })
      .withMessage("Invalid value found..."),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Comment must be numeric")
  ],

  getLessonComments: [
    param("lesson_id")
      .trim()
      .notEmpty()
      .withMessage("Lesson is required")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Lesson must be numeric"),
    query("page_items").optional().isInt({ min: 1 }).withMessage("Items must be a positive number"),
    query("pgNo").optional().isInt({ min: 1 }).withMessage("Page must be a positive number"),
    query("page_items2").optional().isInt({ min: 1 }).withMessage("Item second must be a positive number"),
    query("pgNo2").optional().isInt({ min: 1 }).withMessage("Page second must be a positive number")
  ],

  postReply: [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Reply is required")
      .bail()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Reply must be between 1 and 1000 characters")
      .bail()
      .matches(safeStringRegex)
      .withMessage("Invalid characters in reply"),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Comment must be numeric")
  ],

  replyLikeDislike: [
    body("value")
      .trim()
      .notEmpty()
      .withMessage("Value is required")
      .bail()
      .isInt({ min: 0, max: 5 })
      .withMessage("Invalid value found..."),
    body("comment_id")
      .trim()
      .notEmpty()
      .withMessage("Comment is required")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Comment must be numeric")
  ],

  addToWatchlist: [
    body('device_id')
      .trim()
      .notEmpty()
      .withMessage("Device ID is required.")
      .bail()
      .isLength({ min: 8, max: 255 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .bail()
      .matches(/^[A-Za-z0-9-:_]+$/)
      .withMessage("Device ID format is invalid."),
    
    body('content_id')
      .trim()
      .notEmpty()
      .withMessage("Please select a video to add to your watchlist.")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("This Video doesn't exist. Please check the ID and try again."),
    
    body('content_type')
      .trim()
      .notEmpty()
      .withMessage("Oops! There was an issue with the video. Please try again.")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Oops! There was an issue with the content type. Please try again.")
      .bail()
      .isIn(Object.keys(CategoryType))
      .withMessage("Oops! There was an issue with the content type. Please try again.")
  ],

  getFromWatchlist: [
    query("device")
      .trim()
      .notEmpty()
      .withMessage("Device ID is required.")
      .bail()
      .isLength({ min: 8, max: 255 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .bail()
      .matches(/^[A-Za-z0-9-:_]+$/)
      .withMessage("Device ID format is invalid."),

    query('pgNo').optional().isInt({min:1}).toInt(),
    query('page_items').optional().isInt({min:1}).toInt(),
  ],

  getContinueWatching: [
    query('device_id')
      .trim()
      .notEmpty()
      .withMessage("Device ID is required.")
      .bail()
      .isLength({ min: 8, max: 255 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .bail()
      .matches(/^[A-Za-z0-9-:_]+$/)
      .withMessage("Device ID format is invalid."),
    query('pgNo').optional().isInt({min:1}).toInt(),
    query('page_items').optional().isInt({min:1}).toInt(),
  ],

  updateContinueWatching: [
    body('device_id')
      .trim()
      .notEmpty()
      .withMessage("Device ID is required.")
      .bail()
      .isLength({ min: 8, max: 255 })
      .withMessage("We couldn't find the device you're looking for. Please log in again.")
      .bail()
      .matches(/^[A-Za-z0-9-:_]+$/)
      .withMessage("Device ID format is invalid."),

    body('content_id')
      .trim()
      .notEmpty()
      .withMessage("Content ID is required.")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Invalid content ID provided."),

    body('content_type')
      .trim()
      .notEmpty()
      .withMessage("Content type is required.")
      .bail()
      .isInt({ gt: 0 })
      .withMessage("Invalid content type provided.")
      .bail()
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
      .bail()
      .isFloat({ min: 0 })
      .withMessage("Timing must be a non-negative number.")
  ],
}
