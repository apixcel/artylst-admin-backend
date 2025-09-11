export type TRoles = "fan" | "artist" | "admin" | "business";

export interface IUserJWTPayload {
  _id: string;
  email: string;
  role: TRoles;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface IUser {
  role: TRoles;
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}
