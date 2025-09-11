import { Router } from "express";
import metaController from "../controller/meta.controller";

const router = Router();

router.get("/genre", metaController.getGenres);
router.get("/vibe", metaController.getVibes);

const metaRoute = router;
export default metaRoute;
