"use client";
import { createContext, useContext, useEffect, useState } from "react";

type HistoryContextType = {
  histories: string[];
  currentFile: string | null;
  setCurrentFile: (file: string) => void;
  newHistory: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [histories, setHistories] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // โหลดไฟล์ทั้งหมด
  useEffect(() => {
    fetch("/api/history")
      .then(res => res.json())
      .then(data => setHistories(data.histories || []));
  }, []);

  const newHistory = async () => {
    // หาชื่อไฟล์ใหม่ = ประวัติ{n+1}.json
    const nextIndex = histories.length + 1;
    const fileName = `Chat${nextIndex}.json`;

    // เรียก API เพื่อสร้างไฟล์เปล่า
    const res = await fetch("/api/history", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: fileName })
    });
    const data = await res.json();

    setHistories(prev => [...prev, fileName]);
    setCurrentFile(fileName);
  };

  return (
    <HistoryContext.Provider
      value={{ histories, currentFile, setCurrentFile, newHistory }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryContext() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    return {
      histories: [],
      currentFile: null,
      setCurrentFile: () => {},
      newHistory: async () => {},
    };
  }
  return ctx;
}
