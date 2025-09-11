import { readFileSync } from "fs";

const getFileContent = (filePath: string) => {
  const file = readFileSync(filePath, "utf-8");
  return file;
};

const fileUtils = {
  getFileContent,
};

export default fileUtils;
