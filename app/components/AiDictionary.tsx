"use client";
import { useEffect, useRef, useState } from "react";
import { AI_RESPONSES } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

export default function AiDictionary() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<{from:"user"|"ai";text:string}[]>([
    { from:"ai", text:"Hello Doctor! I'm your AI Medical Dictionary. Ask me about diseases or treatments." }
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [log]);

  function send() {
    const m = msg.trim(); if (!m) return;
    setLog(l => [...l, { from:"user", text:m }]);
    setMsg("");
    setTimeout(() => {
      const key = Object.keys(AI_RESPONSES).find(k => m.toLowerCase().includes(k));
      const reply = key ? AI_RESPONSES[key] : `Searching for "${m}"… Consider proper diagnosis and pharmacotherapy per clinical guidelines.`;
      setLog(l => [...l, { from:"ai", text:reply }]);
    }, 700);
  }

  return (
    <div className={`${styles.card} ${styles.aiCard}`}>
      <div className={styles.aiHeader}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span className={styles.aiTitle}>AI Dictionary</span>
        <span className={styles.aiBadge}>AI</span>
      </div>
      <div className={styles.chatLog}>
        {log.map((m, i) => (
          <div key={i} className={`${styles.chatBubble} ${m.from==="ai" ? styles.chatAi : styles.chatUser}`}>{m.text}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className={styles.chatInputRow}>
        <input className={styles.chatInput} placeholder="Type a medical term…" value={msg}
          onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} />
        <button className={styles.chatSend} onClick={send}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
