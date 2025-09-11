import Order from "../models/order.model";

const generateOrderId = async (): Promise<string> => {
  // Find the latest order sorted by createdAt (or orderId as number)
  const lastOrder = await Order.findOne().sort({ createdAt: -1 }).lean();

  if (!lastOrder || !lastOrder.orderId) {
    return "0001"; // first order
  }

  // Parse orderId as a number
  const lastIdNum = parseInt(lastOrder.orderId, 10) || 0;
  const nextIdNum = lastIdNum + 1;

  // Format: pad to 4 digits, but don’t truncate if > 9999
  if (nextIdNum <= 9999) {
    return String(nextIdNum).padStart(4, "0");
  } else {
    return String(nextIdNum);
  }
};

const orderUtils = {
  generateOrderId,
};

export default orderUtils;
