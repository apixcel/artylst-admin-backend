import { z } from "zod";

const userNameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters long" })
  .max(20, { message: "Username must be at most 20 characters long" })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  });

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(32, { message: "Password must not exceed 32 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" });

const emailSchema = z
  .string({ message: "Email is required" })
  .email({ message: "Invalid email address" });

const checkUserName = z.object({
  userName: userNameSchema,
});
const login = z.object({
  email: emailSchema,
  password: z.string({ message: "Password is required" }),
});

const resetPassword = z.object({
  token: z.string({ message: "Token is required" }),
  password: z.string({ message: "A new 'Password' is required" }),
});
const changePassword = z.object({
  oldPassword: z.string({ message: "oldpassword is required" }),
  password: passwordSchema,
});

const forgotPassword = z.object({
  email: emailSchema,
});

const sendVerificationEmail = z.object({
  email: emailSchema,
});

export const authValidation = {
  login,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  checkUserName,
  forgotPassword,
};
