import { Router } from "express";

import { resetPassword } from "../controllers/forget.controllers.js";

import { passwordValidator } from "../validators/reset.validators.js";

const forgetRouter = Router();

forgetRouter.post("/reset", passwordValidator.resetPassword, resetPassword);

export default forgetRouter;