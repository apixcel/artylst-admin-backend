import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

const {
  FRONTEND_BASE_URL,
  ACCESS_TOKEN_SECRET,
  NODE_ENV,
  DB_URL,
  PORT,
  MAIL_PASSWORD,
  MAIL_ADDRESS,
  CD_CLOUD_NAME,
  CD_API_SECRET,
  CD_API_KEY,
  SERVER_BASE_URL,
  ADMIN_DEFAULT_PASSWORD,
  ADMIM_EMAIL,
} = process.env;
export default {
  database_url: DB_URL,
  MAIL_ADDRESS: MAIL_ADDRESS,
  MAILPASS: MAIL_PASSWORD,
  CD_CLOUD_NAME,
  CD_API_SECRET,
  CD_API_KEY,
  port: PORT,
  NODE_ENV: NODE_ENV,
  ACCESS_TOKEN: {
    SECRET: ACCESS_TOKEN_SECRET,
    EXPIRY: "1h",
  },
  FRONTEND_BASE_URL: NODE_ENV === "development" ? "http://localhost:3000" : FRONTEND_BASE_URL,
  SERVER_BASE_URL,
  ADMIN_DEFAULT_PASSWORD,
  ADMIM_EMAIL,
};
