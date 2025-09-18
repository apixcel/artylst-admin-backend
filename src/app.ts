import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./app/config";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import Auth from "./app/models/auth.model";
import router from "./app/routes";
import sendResponse from "./app/utils/send.response";

const app: Application = express();

// parsers
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [config.FRONTEND_BASE_URL!],
    credentials: true,
    // exposedHeaders: ["Content-Disposition"],
  })
);

// application routes
app.use("/api/v1", router);

// test route
app.get("/", async (_req: Request, res: Response) => {
  await Auth.updateMany({}, { $set: { isBanned: false } });
  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Hello From Server",
  });
});

app.use(notFound);
// global error handler
app.use(globalErrorHandler);

// not found route

export default app;
