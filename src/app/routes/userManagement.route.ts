import { Router } from "express";
import userManagementController from "../controller/userManagement.controller";
import authMiddleware from "../middlewares/authValidation";

const router = Router();
router.use(authMiddleware.isAuthenticatedUser(), authMiddleware.authorizeRoles("admin"));
router.get("/fan-and-business", userManagementController.getAllFanAndBusinessAccounts);
router.patch("/toggle-ban/:authId", userManagementController.toggleAccountBanStatus);

const userManagementRoute = router;
export default userManagementRoute;
