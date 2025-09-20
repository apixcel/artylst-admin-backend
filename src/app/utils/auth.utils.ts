import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import nodemailer from "nodemailer";
import { join } from "path";
import useragent from "useragent";
import config from "../config";
import { AUTH_MAX_LOGIN_DEVICE } from "../constants/auth.constant";
import AppError from "../errors/AppError";
import { IUserJWTPayload, TRoles } from "../interface/auth.interface";
import Admin from "../models/admin.model";
import Auth from "../models/auth.model";
import Session from "../models/session.model";
import fileUtils from "./files";
import { randomString, slugify } from "./utils";
const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const generateAccessToken = (payload: IUserJWTPayload) => {
  const { EXPIRY, SECRET = "" } = config.ACCESS_TOKEN;

  const token = jwt.sign(payload, SECRET, { expiresIn: EXPIRY } as SignOptions);
  return token;
};

const generateRawRefreshToken = () => {
  return crypto.randomBytes(64).toString("base64url");
};

const generateOTP = (length = 6) => {
  const otp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, "0");
  return otp;
};

const verifyAccessToken = (token: string) => {
  const { SECRET = "" } = config.ACCESS_TOKEN;
  const payload = jwt.verify(token, SECRET);
  return payload;
};
const hashString = (password: string) => {
  const hash = bcrypt.hash(password, 10);
  return hash;
};

const matchHashString = async (password: string, hash: string) => {
  const isMatch = await bcrypt.compare(password, hash);
  return isMatch;
};
const sendMessage = async (data: { message: string; receiver: string; subject: string }) => {
  // to send message on phone number
  return data;
};
const sendEmail = async (data: { html: string; receiverMail: string; subject: string }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.apixcel.com",
      port: 587,
      secure: false,
      auth: {
        user: config.MAIL_ADDRESS as string,
        pass: config.MAILPASS as string,
      },
    });

    const mailOptions = {
      from: config.MAIL_ADDRESS,
      to: data.receiverMail,
      subject: data.subject,
      html: data.html,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendVerificationEmail = async (email: string) => {
  const user = await Auth.findOne({ email }).select("+otp");
  if (!user) {
    throw new AppError(404, "User not found");
  }
  if (user.isVerified) {
    throw new AppError(400, "User already verified");
  }

  const now = Date.now();
  const isCooldownActive = user.otp?.coolDown && user.otp.coolDown > now;

  if (isCooldownActive && user.otp?.coolDown) {
    const waitTime = Math.ceil((user.otp.coolDown - now) / 1000);

    return {
      cooldownEnd: user.otp?.coolDown,
      remainingSecond: waitTime,
    };
  }
  const otp = Math.floor(100000 + Math.random() * 900000);
  const newCoolDown = now + 5 * 60 * 1000;
  const waitTime = Math.ceil((newCoolDown - now) / 1000);
  await Auth.findByIdAndUpdate(user._id, {
    otp: {
      code: otp,
      coolDown: newCoolDown,
    },
  });

  const file = fileUtils.getFileContent(join(__dirname, "../templates/email_verification.html"));
  const template = file.replace(/{{OTP}}/g, otp.toString());

  await sendEmail({
    html: template,
    receiverMail: email,
    subject: "Account Verification",
  });

  return {
    cooldownEnd: newCoolDown,
    remainingSecond: waitTime,
  };
};

const sha256 = (value: string) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

const issueTokensForDevice = async (
  req: Request,
  auth: { _id: string; email: string; role: TRoles }
) => {
  const sessionCount = await Session.countDocuments({
    auth: auth._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (sessionCount >= AUTH_MAX_LOGIN_DEVICE) {
    throw new AppError(400, "SESSION_MAX_OUT");
  }

  const rawRefresh = generateRawRefreshToken();

  const refreshTokenHash = await hashString(rawRefresh);
  const refreshTokenSha = sha256(rawRefresh);

  const ua = useragent.parse(req.headers["user-agent"]);

  const session = await Session.create({
    auth: auth._id,
    refreshTokenSha,
    refreshTokenHash,
    userAgent: ua.toString() || "",
    ip: req.ip,
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  const accessToken = generateAccessToken({
    _id: auth._id,
    email: auth.email,
    role: auth.role,
    sid: session._id.toString(),
  });

  return { accessToken, refreshToken: rawRefresh, session };
};

const generateUserName = async (fullName?: string) => {
  const base = fullName ? slugify(fullName) : "";
  let userName: string;

  if (base) {
    // start with base
    userName = base;
  } else {
    // fallback to random string
    userName = randomString(8);
  }

  let isTaken = await Auth.exists({ userName });

  // keep looping until free
  let counter = 1;
  while (isTaken) {
    if (base) {
      userName = `${base}${counter}`;
      counter++;
    } else {
      userName = randomString(8);
    }
    isTaken = await Auth.exists({ userName });
  }

  return userName;
};

const adminSeed = async () => {
  const { ADMIM_EMAIL, ADMIN_DEFAULT_PASSWORD } = config;

  const isAdminExist = await Auth.findOne({ role: "admin" });

  if (!isAdminExist) {
    const userName = await generateUserName("site admin");

    const hash = await hashString(ADMIN_DEFAULT_PASSWORD || "");
    const auth = await Auth.create({
      userName,
      email: ADMIM_EMAIL,
      password: hash,
      role: "admin",
      isVerified: true,
    });

    await Admin.create({
      email: ADMIM_EMAIL,
      fullName: "Site Admin",
      auth: auth._id,
    });
  }
};

const authUtils = {
  generateAccessToken,
  generateOTP,
  verifyAccessToken,
  hashString,
  sendMessage,
  sendEmail,
  sendVerificationEmail,
  matchHashString,
  issueTokensForDevice,
  generateRawRefreshToken,
  ACCESS_TOKEN_TTL,
  REFRESH_TTL_MS,
  sha256,
  generateUserName,
  adminSeed,
};

export default authUtils;
