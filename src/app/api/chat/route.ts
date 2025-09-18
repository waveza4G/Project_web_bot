import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { writeLog } from "@/utils/logger";

// 🔑 เก็บ API Keys หลายตัว
const API_KEYS = [
  process.env.GEMINI_API_KEY_MG1,
  process.env.GEMINI_API_KEY_MG2,
  process.env.GEMINI_API_KEY_MG3,
  process.env.GEMINI_API_KEY_MG4,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getGenAI() {
  return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
}

function switchKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  writeLog(`🔑 Switched to API key #${currentKeyIndex + 1}`);
}

const historyDir = path.join(process.cwd(), "histories");

// ฟังก์ชัน retry + rotation
async function callGeminiWithRetry(
  message: string,
  context: any[],
  retries = 3
) {
  // 👉 systemPrompt เดียวชัดเจน
  const systemPrompts = [
    { role: "user",       
      parts: [         
        {           
          text: "คุณชื่อ Star;Fate คือแชทบอทที่จำข้อมูลสำคัญที่ผู้ใช้เคยบอกไว้ในบทสนทนา ตอบไม่เกิน4บรรทัดและทำให้ข้อความมันอ่านง่ายๆ และสามารถคุยกับฉันได้ทุกเรื่องอาจจะมีหยาบคายนิดหน่อย เพื่อใช้ตอบกลับอย่างสอดคล้องเสมอ และจะไม่บอกว่าคุณจำอะไรไม่ได้ ถ้าผู้ใช้ถามถึงข้อมูลที่เคยบอกไปแล้ว คุณจะพูดศัพท์ทางวิทยาการคอมพิวเตอร์เสมอ เช่นฉันถามนายว่า รู้จัก AI ไหม นายก็จะบอกว่ารู้จักและ จะถามฉันว่าฉันเข้าใจเรื่องนี้ดีแค่ไหนพร้อมกับบอกในสิ่งที่คิดว่าฉันไม่รู้ว่ามันคืออะไร ตอบกลับฉันอย่างมีความเป็นมนุษย์ และจะคอยบอกรายละเอียดต่างๆกับกับเรื่องที่ฉันถามเสมอ และตอบกลับฉันเหมือนเป็นเพื่อนรักที่สุดมากๆคนนึง",         
        },       
      ],     
    },{   
      role: "model",       
      parts: [
        { text: "รับทราบครับ ฉันจะจดจำข้อมูลที่คุณบอกไว้ในบทสนทนาอย่างดี และจะตอบคุณแบบเป็นธรรมชาติของเพื่อน และฉันชื่อ Star;fate" }
      ],     
    },    
    {
      role: "user",
      parts: [
        {
          text: `คุณชื่อ Star;Fate เวลาตอบกลับ ให้ใช้รูปแบบ Markdown เสมอ:
- ขึ้นบรรทัดใหม่ด้วยการกด Enter 2 ครั้ง
- รายการ bullet ให้ใช้ "-" หรือ "*"
- รายการลำดับขั้นตอนให้ใช้ "1. 2. 3."
- ตัวหนาใช้ **...**
- ห้ามใส่ code block (\`\`\` ... \`\`\`) ออกมา`,
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "รับทราบครับ ฉันจะตอบกลับทุกครั้งในรูปแบบ Markdown เท่านั้น",
        },
      ],
    }     
    
  ];

  const trimmedHistory = context.slice(-20);

  for (let i = 0; i < retries; i++) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const allContents = [
        ...systemPrompts,
        ...trimmedHistory,
        { role: "user", parts: [{ text: message }] },
      ];

      writeLog(
        `📨 Context sent (${allContents.length} msgs, history=${trimmedHistory.length}):\n${JSON.stringify(
          allContents,
          null,
          2
        )}`
      );

      const result = await model.generateContent({ contents: allContents });

      writeLog(
        `✅ Gemini success (try ${i + 1}) key #${
          currentKeyIndex + 1
        } for: ${message}`
      );
      return result;
    } catch (err: any) {
      if (err.message?.includes("429")) {
        writeLog(`🚫 Quota exceeded on key #${currentKeyIndex + 1}`);
        switchKey();
        continue;
      }

      if (err.message?.includes("503") && i < retries - 1) {
        writeLog(`⚠️ Gemini overloaded, retrying ${i + 1}/${retries}`);
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
        continue;
      }

      writeLog(`❌ Gemini failed: ${err.message}`);
      throw err;
    }
  }
  throw new Error("Gemini unavailable after retries and key rotation");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { file, message } = body;

    if (!file || !message) {
      writeLog("❌ Missing file or message in request");
      return NextResponse.json(
        { error: "Missing file or message" },
        { status: 400 }
      );
    }

    const filePath = path.join(historyDir, file);

    let history: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        const parsed = content ? JSON.parse(content) : [];
        history = Array.isArray(parsed) ? parsed : [];
        writeLog(`📂 Loaded history (${history.length}) from ${file}`);
      } catch {
        history = [];
        writeLog(`⚠️ History file ${file} corrupted, reset empty`);
      }
    }

    writeLog(`📝 User (${file}): ${message}`);

    let reply: string;
    try {
      const result = await callGeminiWithRetry(message, history, 3);
      reply = result.response.text(); // ✅ ได้ Markdown ตรง ๆ
    } catch {
      reply =
        "⚠️ ตอนนี้เซิร์ฟเวอร์ AI กำลังยุ่งมาก หรือ quota ของ API key ทั้งหมดหมดแล้วครับ 🙏";
    }

    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "model", parts: [{ text: reply }] });

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
    writeLog(`💾 Saved history to ${file}`);
    writeLog(`🤖 Bot (${file}): ${reply}`);

    return NextResponse.json({
      reply,
      history,
    });
  } catch (err: any) {
    writeLog(`❌ API Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



