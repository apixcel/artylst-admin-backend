import { Router } from "express";
import artistController from "../controller/artist.controller";
import authMiddleware from "../middlewares/authValidation";
const router = Router();

router.get("/", artistController.getArtists);
router.get("/ranked", artistController.getRankedArtists);
router.get(
  "/profile/:userName",
  authMiddleware.isAuthenticatedUser({ isOptional: true }),
  artistController.getArtistProfileByUserName
);

router.get("/get-pricing/:userName", artistController.getPicingListByArtistUserName);
router.get("/top-viewed", artistController.topViewedArtistsLast30Days);

const artistRoute = router;
export default artistRoute;
