import express from "express";
import swaggerDocs from "../utils/swagger";
import artistRoute from "./artist.route";
import authRoute from "./auth.route";
import metaRoute from "./meta.route";
import orderRoute from "./order.route";
import uploadRoute from "./upload.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth/admin",
    route: authRoute,
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
