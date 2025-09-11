/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Router } from "express";
import uploadController from "../controller/upload.controller";
import authMiddleware from "../middlewares/authValidation";
import { upload } from "../middlewares/multer";
const router = Router();

router.use(authMiddleware.isAuthenticatedUser());
// @ts-ignore
router.post("/single", upload.single("file"), uploadController.uploadSingle);
// @ts-ignore
router.post("/multiple", upload.array("files"), uploadController.uploadMultiple);
const uploadRoute = router;
export default uploadRoute;
