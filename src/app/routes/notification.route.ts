import { Router } from "express";
import notificationController from "../controller/notification.controller";
import authMiddleware from "../middlewares/authValidation";

const router = Router();

router.use(authMiddleware.isAuthenticatedUser(), authMiddleware.authorizeRoles("admin"));
router.post("/broadcast", notificationController.createBroadcastNotification);
router.get("/broadcast", notificationController.getAllBroadcastNotifications);

const notificationRoute = router;
export default notificationRoute;
