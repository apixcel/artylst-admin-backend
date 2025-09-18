import express from "express";
import swaggerDocs from "../utils/swagger";
import adminRoute from "./admin.route";
import artistRoute from "./artist.route";
import authRoute from "./auth.route";
import metaRoute from "./meta.route";
import orderRoute from "./order.route";
import uploadRoute from "./upload.route";
import userManagementRoute from "./userManagement.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth/admin",
    route: authRoute,
  },
  {
    path: "/admin",
    route: adminRoute,
  },
  {
    path: "/artist",
    route: artistRoute,
  },
  {
    path: "/order",
    route: orderRoute,
  },
  {
    path: "/user-management",
    route: userManagementRoute,
  },
  {
    path: "/meta",
    route: metaRoute,
  },
  {
    path: "/upload",
    route: uploadRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
swaggerDocs(router);

export default router;
