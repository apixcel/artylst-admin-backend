import { Router } from "express";
import orderController from "../controller/order.controller";
import authMiddleware from "../middlewares/authValidation";

const router = Router();

router.use(authMiddleware.isAuthenticatedUser(), authMiddleware.authorizeRoles("admin"));

router.get("/get-all", orderController.geteAllOrders);

const orderRoute = router;
export default orderRoute;
