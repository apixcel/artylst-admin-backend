import { Router } from "express";
import notificationController from "../controller/notification.controller";
import authMiddleware from "../middlewares/authValidation";
import { validSchema } from "../middlewares/validator";
import notificationValidation from "../zodValidation/notification.zod";

const router = Router();

router.use(authMiddleware.isAuthenticatedUser(), authMiddleware.authorizeRoles("admin"));
router.post(
  "/broadcast",
  validSchema(notificationValidation.createBroadcastNotification),
  notificationController.createBroadcastNotification
);
router.get("/broadcast", notificationController.getAllBroadcastNotifications);

const notificationRoute = router;
export default notificationRoute;
