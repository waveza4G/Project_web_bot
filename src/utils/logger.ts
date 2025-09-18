import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
const logFile = path.join(logDir, "app.log");

// ถ้าไม่มีโฟลเดอร์ logs → สร้างให้
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

export function writeLog(message: string) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${message}\n`);
}


