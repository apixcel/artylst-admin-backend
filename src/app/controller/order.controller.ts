import QueryBuilder from "../builder/QueryBuilder";
import { IAnyObject } from "../interface/any";
import Order from "../models/order.model";
import catchAsyncError from "../utils/catchAsync";
import sendResponse from "../utils/send.response";

const geteAllOrders = catchAsyncError(async (req, res) => {
  const query = req.query;

  const match: IAnyObject = {};

  if (query.startDate) {
    match.createdAt = {
      $gte: new Date(query.startDate as string),
    };
  }

  if (query.endDate) {
    match.createdAt = {
      $lte: new Date(query.endDate as string),
    };
  }

  ["endDate", "startDate"].forEach((key) => delete query[key]);

  const model = Order.find(query).populate({ path: "artist", select: "user_name" });
  const queryModel = new QueryBuilder(model, req.query)
    .search(["email", "tier", "deliveryInfo.email", "deliveryInfo.name", "orderId"])
    .paginate()
    .sort()
    .filter();
  await queryModel.count();
  const orders = await queryModel.modelQuery;
  const meta = queryModel.getMeta();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: orders,
    message: "Orders fetched successfully",
    meta,
  });
});

const orderController = {
  geteAllOrders,
};

export default orderController;
