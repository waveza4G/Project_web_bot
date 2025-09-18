"use client";
import { useState, useEffect, useRef } from "react";
import { useHistoryContext } from "./HistoryContext";
import ReactMarkdown from "react-markdown"; // ✅ เพิ่ม

export default function Home() {
  const { currentFile } = useHistoryContext();
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loadedFile, setLoadedFile] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [loading, setLoading] = useState(false);

  const isNearBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return false;
    const threshold = 50;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isNearBottom()) {
        setShowScrollButton(false);
      } else {
        setShowScrollButton(true);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // โหลดข้อความเก่า
  useEffect(() => {
    if (!currentFile || currentFile === loadedFile) return;

    setLoading(true);
    fetch(`/api/history?file=${currentFile}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.history)) {
          const formatted = data.history.map((h: any) => ({
            sender: h.role === "user" ? "user" : "bot",
            text: h.parts?.[0]?.text || "",
          }));
          setMessages(formatted);
        } else {
          setMessages([]);
        }
        setLoadedFile(currentFile);
      })
      .catch((err) => {
        console.error("❌ Failed to load history:", err);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [currentFile, loadedFile]);

  const sendMessage = async () => {
    if (!input || !currentFile) return;

    console.log("📩 Client send USER:", input);

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: currentFile, message: input }),
      });

      const data = await res.json();

      if (Array.isArray(data.history)) {
        const formatted = data.history.map((h: any) => ({
          sender: h.role === "user" ? "user" : "bot",
          text: h.parts?.[0]?.text || "",
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    } finally {
      setLoading(false);
    }

    setInput("");
  };

  return (
    <main>
      {currentFile ? (
        <>
          <h3 style={{ padding: "0.5rem 1rem" }}>💬 กำลังคุยใน: {currentFile}</h3>

          {loading && (
            <p style={{ padding: "0.5rem 1rem", color: "orange" }}>
              ⏳ กำลังรอทำงาน...
            </p>
          )}

        <div className="chat-container" ref={chatContainerRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.sender}`}>
              <ReactMarkdown>
                {msg.text}
              </ReactMarkdown>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>


          {showScrollButton && (
            <button
              onClick={() => {
                const el = chatContainerRef.current;
                if (el) {
                  el.scrollTo({
                    top: el.scrollHeight,
                    behavior: "smooth",
                  });
                }
              }}
              style={{
                position: "absolute",
                bottom: "80px",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                background: "#38bdf8",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              ⬇
            </button>
          )}

          <div className="input-box">
            <input
              type="text"
              placeholder="พิมพ์ข้อความ..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading}>
              {loading ? "..." : "ส่ง"}
            </button>
          </div>
        </>
      ) : (
        <p style={{ padding: "1rem" }}>
          🗂️ กรุณาเลือกหรือสร้างประวัติใหม่จากด้านบน
        </p>
      )}
    </main>
  );
}
