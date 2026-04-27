import { Router } from "express";

import {
  signup,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { passwordRules } from "../validators/passwordPolicy";
import { validate } from "../middleware/validate.middleware";
import { signupSchema, loginSchema } from "../validators/schemas";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

// Password reset (OTP-based, no auth required)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Public — UI uses this to render the live password-rule checklist
router.get("/password-policy", (_req, res) => {
  res.status(200).json({
    rules: passwordRules.map((r) => ({ id: r.id, label: r.label }))
  });
});

router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/password", authMiddleware, updatePassword);

export default router;
