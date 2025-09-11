import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import AppError from "../errors/AppError";
import { IUserJWTPayload, TRoles } from "../interface/auth.interface";
import Auth from "../models/auth.model"; // adjust path if needed
import Session from "../models/session.model";
import { IUserInfoRequest } from "../utils/catchAsync";

const getAccessTokenFromReq = (req: Request) => {
  const hdr = req.header("Authorization");
  if (hdr) {
    const token = hdr.split("Bearer ")[1];
    return token || "";
  } else {
    const token = req.cookies.accessToken;
    return token || "";
  }
};

const isAuthenticatedUser =
  ({ isOptional = false }: { isOptional?: boolean } = {}) =>
  async (req: IUserInfoRequest, _res: Response, next: NextFunction) => {
    try {
      const token = getAccessTokenFromReq(req);
      if (!token) {
        if (isOptional) {
          return next();
        }
        throw new AppError(401, "UNAUTHORIZED");
      }

      let payload: IUserJWTPayload;
      try {
        payload = jwt.verify(token, config.ACCESS_TOKEN.SECRET as string) as IUserJWTPayload;
      } catch {
        if (isOptional) {
          return next();
        }
        throw new AppError(401, "ACESS_EXPIRED");
      }

      const authDoc = await Auth.findById(payload._id).select("+passwordChangedAt");
      if (!authDoc) {
        if (isOptional) {
          return next();
        }
        throw new AppError(403, "INVALID ACCESS TOKEN");
      }

      if (authDoc.passwordChangedAt && payload.iat) {
        const pwdChangedAtSec = Math.floor(new Date(authDoc.passwordChangedAt).getTime() / 1000);
        if (pwdChangedAtSec > payload.iat) {
          if (isOptional) {
            return next();
          }
          throw new AppError(419, "SESSION_EXPIRED");
        }
      }

      // 3) Ensure the session (device) is still active
      if (!payload.sid) {
        if (isOptional) {
          return next();
        }
        throw new AppError(401, "Session not attached to token");
      }

      const now = new Date();
      const session = await Session.findOne({
        _id: payload.sid,
        auth: payload._id,
        revokedAt: null,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      });

      if (!session) {
        if (isOptional) {
          return next();
        }
        throw new AppError(419, "Session revoked or expired");
      }

      // 4) Update lastSeen for device tracking
      session.lastSeenAt = now;
      await session.save().catch(() => void 0);

      req.user = {
        _id: authDoc._id.toString(),
        email: authDoc.email,
        role: authDoc.role,
        sid: session._id.toString(),
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };

const authorizeRoles = (...roles: TRoles[]) => {
  return (req: IUserInfoRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      return next(new AppError(403, `FORBIDDEN ACCESS`));
    }
    next();
  };
};

const authMiddleware = { isAuthenticatedUser, authorizeRoles };
export default authMiddleware;
