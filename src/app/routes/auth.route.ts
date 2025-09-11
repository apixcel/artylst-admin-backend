import { Router } from "express";
import authController from "../controller/auth.controller";
import authMiddleware from "../middlewares/authValidation";
import { validSchema } from "../middlewares/validator";
import { authValidation } from "../zodValidation/auth.zod";

const router = Router();
const authRoute = router;

router.post("/login", validSchema(authValidation.login), authController.login);

router.post("/refresh-token", authController.refreshToken);

router.post(
  "/send-verify-email",
  validSchema(authValidation.sendVerificationEmail),
  authController.sendVerificationEmail
);

router.post("/verify-email", authController.verifyEmail);

router.post(
  "/send-verification-email",
  validSchema(authValidation.sendVerificationEmail),
  authController.sendVerificationEmail
);

router.post(
  "/forgot-password",
  validSchema(authValidation.forgotPassword),
  authController.forgotPasswordRequest
);

router.put(
  "/reset-password",
  validSchema(authValidation.resetPassword),
  authController.resetPassword
);

router.use(authMiddleware.isAuthenticatedUser());

router.put(
  "/change-password",
  validSchema(authValidation.changePassword),
  authController.changePassword
);

router.post("/logout", authController.logOut);
router.get("/session", authController.getSessions);

router.post("/session/revoke", authController.revokeAllSessions);
router.post("/session/revoke/:sessionId", authController.revokeSessionBySessionId);

router.get("/profile", authController.authProfile);
export default authRoute;
