import "./globals.css";
import React from "react";
import { HistoryProvider } from "./HistoryContext";
import HistoryTabs from "./HistoryTabs";

export const metadata = {
  title: "Relax Chatbot",
  description: "เว็บแชทบอทธีมสบายตา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <HistoryProvider>
          <header style={{ background: "linear-gradient(90deg, #38bdf8, #34d399)", color: "white", padding: "1rem" }}>
            🤖 บอทผู้ช่วย คนที่ทำให้รู้ทุกสิ่งทุกอย่างบนโลกใบนี้(Star;Fate)
          </header>

          <HistoryTabs />

          {children}
        </HistoryProvider>
      </body>
    </html>
  );
}
