import QueryBuilder from "../builder/QueryBuilder";
import { IAnyObject } from "../interface/any";
import Notification from "../models/notification.model";
import catchAsyncError from "../utils/catchAsync";
import sendResponse from "../utils/send.response";

const createBroadcastNotification = catchAsyncError(async (req, res) => {
  const body = req.body;

  const result = await Notification.create({
    ...body,
    auth: null,
  });

  sendResponse(res, {
    data: result,
    success: true,
    statusCode: 200,
    message: "Notification sent successfully",
  });
});

const getAllBroadcastNotifications = catchAsyncError(async (req, res) => {
  const query = req.query;

  const match: IAnyObject = {};

  if (query.startDate || query.endDate) {
    match.createdAt = {};
    if (query.startDate) {
      match.createdAt = {
        $gte: new Date(query.startDate as string),
      };
    }

    if (query.endDate) {
      match.createdAt = {
        ...match.createdAt,
        $lte: new Date(query.endDate as string),
      };
    }
  }
  if (query.audienceType) {
    const audiences = (query.audienceType as string).split(",").filter(Boolean);
    match.audienceType = { $in: audiences };
  }

  ["endDate", "startDate", "audienceType"].forEach((key) => delete query[key]);

  const model = Notification.find({ ...match, auth: null });

  const queryBuilder = new QueryBuilder(model, query)
    .search(["title", "description"])
    .filter()
    .sort()
    .paginate();
  await queryBuilder.count();
  const notifications = await queryBuilder.modelQuery;
  const meta = queryBuilder.getMeta();

  sendResponse(res, {
    data: notifications,
    success: true,
    statusCode: 200,
    message: "Notifications fetched successfully",
  });
});

const notificationController = {
  createBroadcastNotification,
  getAllBroadcastNotifications,
};

export default notificationController;
