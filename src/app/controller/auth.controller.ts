import { join } from "path";
import config from "../config";
import AppError from "../errors/AppError";
import Admin from "../models/admin.model";
import Auth from "../models/auth.model";
import ForgotPasswordToken from "../models/forgotPasswordToken.model";
import Session from "../models/session.model";
import authUtils from "../utils/auth.utils";
import catchAsyncError from "../utils/catchAsync";
import fileUtils from "../utils/files";
import sendResponse from "../utils/send.response";

const login = catchAsyncError(async (req, res) => {
  const body = req.body;

  const isExist = await Auth.findOne({
    email: body.email,
  }).select("+password");

  if (!isExist) {
    throw new AppError(404, "Invalid Login Credentials");
  }

  if (isExist.role !== "admin") {
    throw new AppError(404, "Invalid Login Credentials");
  }

  const isMatch = await authUtils.matchHashString(body.password, isExist.password);

  if (!isMatch) {
    throw new AppError(404, "Invalid Login Credentials");
  }

  if (!isExist.isVerified) {
    throw new AppError(404, "Account is not verified");
  }
  const { accessToken, refreshToken } = await authUtils.issueTokensForDevice(req, {
    _id: isExist._id.toString(),
    email: isExist.email,
    role: isExist.role,
  });

  const profile = await Admin.findOne({ auth: isExist._id });

  if (!profile) {
    throw new AppError(404, "Profile not found");
  }

  res
    .cookie("accessToken", accessToken, {
      sameSite: config.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true,
      secure: config.NODE_ENV === "production",
    })
    .cookie("refreshToken", refreshToken, {
      sameSite: config.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 1000 * 24 * 60 * 60 * 30, // 30 days
      httpOnly: true,
      secure: config.NODE_ENV === "production",
    });

  sendResponse(res, {
    data: { ...profile.toObject(), role: isExist.role },
    success: true,
    statusCode: 200,
    message: "logged in successfully",
  });
});

const authProfile = catchAsyncError(async (req, res) => {
  const auth = req.user!;

  const admin = await Admin.findOne({ auth: auth._id });
  if (!admin) {
    throw new AppError(401, "Invalid Credentials");
  }
  sendResponse(res, {
    data: { ...admin.toObject(), role: "admin" },
    success: true,
    statusCode: 200,
    message: "logged in successfully",
  });
});

const refreshToken = catchAsyncError(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new AppError(419, "SESSION_EXPIRED");
  }
  const sha256RefreshToken = authUtils.sha256(refreshToken);

  const session = await Session.findOne({
    refreshTokenSha: sha256RefreshToken,
  });

  if (!session || session.revokedAt) {
    console.log(session);

    throw new AppError(419, "SESSION_EXPIRED");
  }

  const auth = await Auth.findById(session.auth);

  if ((session.expiresAt && session.expiresAt < new Date()) || !auth) {
    throw new AppError(419, "SESSION_EXPIRED");
  }

  const isOk = await authUtils.matchHashString(refreshToken, session.refreshTokenHash);

  if (!isOk) {
    throw new AppError(419, "SESSION_EXPIRED");
  }

  const accessToken = authUtils.generateAccessToken({
    _id: auth._id.toString(),
    email: auth.email,
    role: auth.role || "",
    sid: session._id.toString(),
  });

  res.cookie("accessToken", accessToken, {
    sameSite: config.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 1000 * 60 * 60, // 1 hour
    httpOnly: true,
    secure: config.NODE_ENV === "production",
  });
  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Token refreshed successfully",
  });
});

const sendVerificationEmail = catchAsyncError(async (req, res) => {
  const { email } = req.body;

  const result = await authUtils.sendVerificationEmail(email);
  sendResponse(res, {
    data: result,
    success: true,
    statusCode: 200,
    message: "Verification email sent successfully",
  });
});

const verifyEmail = catchAsyncError(async (req, res) => {
  const { otp, email } = req.body;
  const findUser = await Auth.findOne({ email: email, "otp.code": otp }).select("otp");

  if (!findUser) {
    throw new AppError(404, "Invalid code provided");
  }

  if (findUser.isVerified) {
    throw new AppError(400, "User already verified");
  }

  const isOtpExpired = !findUser.otp?.coolDown || findUser.otp.coolDown < Date.now();

  if (isOtpExpired) {
    throw new AppError(400, "Session expired. Please request a new code");
  }

  await Auth.findByIdAndUpdate(findUser._id, {
    otp: {
      code: null,
      coolDown: null,
    },
    isVerified: true,
  });

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "User verified successfully",
  });
});

const forgotPasswordRequest = catchAsyncError(async (req, res) => {
  const { email } = req.body;

  const auth = await Auth.findOne({ email });
  if (!auth) {
    throw new AppError(404, "Invalid email");
  }

  const isRequested = await ForgotPasswordToken.findOne({
    auth: auth._id,
    expiresAt: { $gt: new Date() },
  });

  if (isRequested) {
    throw new AppError(400, "Request already sent. Please try again after some time");
  }

  const token = await ForgotPasswordToken.create({
    auth: auth._id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes,
  });
  const url = `${config.FRONTEND_BASE_URL}/reset-password/${token._id}`;

  let file = fileUtils.getFileContent(join(__dirname, "../templates/forgot_password.html"));
  file = file.replace(/{{url}}/g, url);

  await authUtils.sendEmail({
    receiverMail: auth.email,
    subject: "Reset your password",
    html: file,
  });

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Reset password email sent successfully",
  });
});

const resetPassword = catchAsyncError(async (req, res) => {
  const { password: newPassword, token } = req.body;

  const decoded = await ForgotPasswordToken.findById(token);

  if (!decoded) {
    throw new AppError(400, "Invalid Session or Session Expired. Try again");
  }

  if (decoded.expiresAt < new Date()) {
    throw new AppError(400, "Session expired. Please request again");
  }

  const user = await Auth.findById(decoded?.auth);

  if (!user) {
    throw new AppError(400, "Invalid Session or Session Expired. Try again");
  }

  const hashedPassword = await authUtils.hashString(newPassword);

  await Auth.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
  });

  const to = user.email;
  const subject = "Account Password Reset";

  if (to) {
    await authUtils.sendEmail({
      html: `
          <p style="text-align: center;">Hey there!, your account password has been reset successfully.</p>`,
      receiverMail: to,
      subject,
    });
  }

  await ForgotPasswordToken.findByIdAndDelete(decoded._id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Password reset successfully",
    data: null,
  });
});

const changePassword = catchAsyncError(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = req.user!;

  const auth = await Auth.findById(user._id).select("password passwordChangedAt");
  if (!auth) {
    throw new AppError(404, "Account not found");
  }

  // ⏱️ Check 30-minute cooldown
  if (auth.passwordChangedAt) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (auth.passwordChangedAt > thirtyMinutesAgo) {
      throw new AppError(
        400,
        "You have changed your password recently. Please try again after some time."
      );
    }
  }

  const isMatch = await authUtils.matchHashString(oldPassword, auth.password);
  if (!isMatch) {
    throw new AppError(400, "Invalid Password");
  }

  const isSamePassword = await authUtils.matchHashString(password, auth.password);
  if (isSamePassword) {
    throw new AppError(400, "New password cannot be same as old password");
  }

  const hashed = await authUtils.hashString(password);
  auth.password = hashed;
  auth.passwordChangedAt = new Date();

  await auth.save();

  await Session.updateMany({ auth: user._id }, { $set: { revokedAt: new Date() } });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Password changed successfully",
    data: null,
  });
});
const logOut = catchAsyncError(async (req, res) => {
  const auth = req.user!;

  await Session.updateOne({ _id: auth.sid, revokedAt: null }, { $set: { revokedAt: new Date() } });

  res.clearCookie("accessToken", {
    path: "/",
    sameSite: config.NODE_ENV === "production" ? "none" : "strict",
    secure: config.NODE_ENV === "production" ? true : false,
  });
  res.clearCookie("refreshToken", {
    path: "/",
    sameSite: config.NODE_ENV === "production" ? "none" : "strict",
    secure: config.NODE_ENV === "production" ? true : false,
  });

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Logged out successfully",
  });
});

const getSessions = catchAsyncError(async (req, res) => {
  const auth = req.user!;
  const sessions = await Session.find({ auth: auth._id, revokedAt: null }).select(
    "-refreshTokenHash -refreshTokenSha"
  );

  const result = sessions.map((session) => {
    const isThisDevice = auth.sid === session._id.toString();
    return {
      ...session.toObject(),
      isThisDevice,
    };
  });

  sendResponse(res, {
    data: result,
    success: true,
    statusCode: 200,
    message: "Sessions fetched successfully",
  });
});

const revokeSessionBySessionId = catchAsyncError(async (req, res) => {
  const sessionId = req.params.sessionId;
  const auth = req.user!;

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError(404, "Session not found");
  }

  if (session.auth.toString() != auth._id) {
    throw new AppError(403, "Forbidden Access");
  }

  if (session.revokedAt) {
    throw new AppError(400, "Session already revoked");
  }

  if (session._id.toString() === auth.sid) {
    throw new AppError(400, "You can't revoke your current session");
  }

  session.revokedAt = new Date();
  await session.save();

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Session revoked successfully",
  });
});

const revokeAllSessions = catchAsyncError(async (req, res) => {
  const auth = req.user!;

  await Session.updateMany(
    { auth: auth._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  res.clearCookie("accessToken", {
    path: "/",
    sameSite: config.NODE_ENV === "production" ? "none" : "strict",
    secure: config.NODE_ENV === "production" ? true : false,
  });
  res.clearCookie("refreshToken", {
    path: "/",
    sameSite: config.NODE_ENV === "production" ? "none" : "strict",
    secure: config.NODE_ENV === "production" ? true : false,
  });

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "All sessions revoked successfully",
  });
});

const authController = {
  sendVerificationEmail,
  login,
  refreshToken,
  forgotPasswordRequest,
  resetPassword,
  verifyEmail,
  changePassword,
  logOut,
  getSessions,
  revokeSessionBySessionId,
  revokeAllSessions,
  authProfile,
};

export default authController;
