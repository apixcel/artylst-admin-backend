import AppError from "../errors/AppError";
import Admin from "../models/admin.model";
import catchAsyncError from "../utils/catchAsync";
import sendResponse from "../utils/send.response";

const updateProfile = catchAsyncError(async (req, res) => {
  const user = req.user!;

  const body = req.body;

  const admin = await Admin.findOne({ auth: user._id }).select("_id");
  if (!admin) {
    throw new AppError(401, "Invalid Credentials");
  }

  ["auth", "email", ""].forEach((field) => {
    delete body[field];
  });

  const updatedAdmin = await Admin.findByIdAndUpdate(admin._id, body, {
    new: true,
    runValidators: true,
  });
  sendResponse(res, {
    data: updatedAdmin,
    success: true,
    statusCode: 200,
    message: "Profile updated successfully",
  });
});

const adminController = {
  updateProfile,
};

export default adminController;
