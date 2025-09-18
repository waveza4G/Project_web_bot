  "use client";
  import { useHistoryContext } from "./HistoryContext";

  export default function HistoryTabs() {
    const { histories, currentFile, setCurrentFile, newHistory } = useHistoryContext();

  return (
    <nav style={{ padding: "0.5rem", background: "#e0f2fe" }}>
      <button onClick={newHistory}>➕ New</button>
      {histories.map((h) => (
        <button
          key={h}
          onClick={() => {
            // ⏳ ดีเลย์ 2 วิ ก่อนเปลี่ยนไฟล์
            setTimeout(() => {
              setCurrentFile(h);
            }, 2000);
          }}
          style={{
            marginLeft: "0.5rem",
            fontWeight: h === currentFile ? "bold" : "normal",
          }}
        >
          {h}
        </button>
      ))}
    </nav>
  );

  }
