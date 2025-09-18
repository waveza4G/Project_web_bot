import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const historyDir = path.join(process.cwd(), "histories");

// ✅ ถ้าไม่มีโฟลเดอร์ histories ให้สร้าง
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir);
}

// GET: โหลดไฟล์ประวัติ (ไฟล์เดียวหรือทั้งหมด)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  if (file) {
    const filePath = path.join(historyDir, file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ history: [] });
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      const history = content ? JSON.parse(content) : [];
      return NextResponse.json({
        history: Array.isArray(history) ? history : [],
      });
    } catch {
      return NextResponse.json({ history: [] });
    }
  } else {
    // ถ้าไม่มี file → คืนรายชื่อไฟล์ทั้งหมด
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".json"));
    return NextResponse.json({ histories: files });
  }
}

// POST: สร้างไฟล์ประวัติใหม่
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fileName = body.file || `Chat${Date.now()}.json`; // ถ้าไม่ได้ส่งชื่อมา ใช้ timestamp
  const filePath = path.join(historyDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  return NextResponse.json({ file: fileName });
} 