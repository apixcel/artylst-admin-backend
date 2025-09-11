import { TRoles } from "../interface/auth.interface";
export const AUTH_GENDERS = ["male", "female"] as const;
export const AUTH_ROLES: TRoles[] = ["artist", "admin", "fan", "business"] as const;
export const AUTH_MAX_LOGIN_DEVICE = 3;
