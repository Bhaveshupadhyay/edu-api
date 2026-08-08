import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import { generateWebsiteToken } from "../controllers/website.link.controllers.js";

import { subscriptionValidators } from "../validators/payment.validators.js";

const webLinkRouter = Router();

webLinkRouter.get("/generate-link/:device_id", authMiddleware, subscriptionValidators.websiteLink, generateWebsiteToken);

export default webLinkRouter;
