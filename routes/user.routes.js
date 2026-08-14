import { Router } from "express";

import {
  get_search_data,
  get_home_data,
  get_nav_pill_collections,
  get_section_content,
  getModulesLessonsData,
  get_lesson_data,
  getPlans,
  get_latest_subscription,
} from "../controllers/user.controllers.js";

import { userValidator } from "../validators/user.validators.js";

import authMiddleware from "../middleware/auth.middleware.js";
import { cacheMiddleware } from "../middleware/cache.middleware.js";

import authorizeRoles from "../middleware/role.middleware.js";
import { UserRole } from "../utils/enums.js";

const userRouter = Router();

// Get users plans
userRouter.get("/plans", getPlans);

// Get search data by term and date
userRouter.get("/search", userValidator.searchData, get_search_data);

// Get home page data
userRouter.get("/home", userValidator.getHomeData, get_home_data);

userRouter.get("/nav-pill/:nav_pill_id", userValidator.getNavPillById, get_nav_pill_collections);

// Get more content for a specific section (infinite scroll)
userRouter.get("/section/:section_id", userValidator.getSectionById, get_section_content);

// Get module with lessons (paginated)
userRouter.get("/modules-lessons/:module_id", authMiddleware, authorizeRoles(UserRole.USER), userValidator.getModulesLessons, getModulesLessonsData);

// Get individual lesson data
userRouter.get("/lesson/:video_provider_id/:ui_style", authMiddleware, authorizeRoles(UserRole.USER), userValidator.getLessonData, get_lesson_data);

// Get user's latest subscription details
userRouter.get("/latest-subscription", authMiddleware, authorizeRoles(UserRole.USER), get_latest_subscription);

export default userRouter;
