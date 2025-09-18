import { Router } from "express";
import adminController from "../controller/admin.controller";
import authMiddleware from "../middlewares/authValidation";

const router = Router();

router.use(authMiddleware.isAuthenticatedUser(), authMiddleware.authorizeRoles("admin"));
router.patch("/update-profile", adminController.updateProfile);

const adminRoute = router;
export default adminRoute;
