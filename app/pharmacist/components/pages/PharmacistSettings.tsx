"use client";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";


const ROLE  = "Pharmacist";

type Tab = "profile" | "password";

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${ok ? "#2db357" : "#ccc"}`,
        background: ok ? "#2db357" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.2s",
      }}>
        {ok && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: 13, color: ok ? "#2db357" : "#888", transition: "color 0.2s" }}>{label}</span>
    </div>
  );
}

type SettingsProps = {
  initialTab?: "profile" | "password";
  profilePhoto: string | null;
  profileUsername: string;
  onPhotoChange: (url: string) => void;
  onUsernameChange: (name: string) => void;
};

export default function PharmacistSettings({ initialTab, profilePhoto, profileUsername, onPhotoChange, onUsernameChange }: SettingsProps) {
  const { t } = useTheme();

  const [tab, setTab] = useState<Tab>(initialTab ?? "profile");

  // ── Profile state ────────────────────────────────────────────────────────────
  const [username, setUsername]   = useState(profileUsername);
  const [email,    setEmail]      = useState("");
  const [saving,   setSaving]     = useState(false);
  const [saveMsg,  setSaveMsg]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUrl = profilePhoto;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onPhotoChange(url);
  }

  async function handleSaveProfile() {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.auth.updateUser({ email });
    setSaving(false);
    if (!error) {
      onUsernameChange(username);
      setSaveMsg("Changes saved successfully!");
    } else {
      setSaveMsg(`Error: ${error.message}`);
    }
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // ── Password state ───────────────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwMsg,      setPwMsg]      = useState("");

  const req8char   = newPw.length >= 8;
  const reqSpecial = /[!@#$%^&*?]/.test(newPw);
  const reqNumber  = /[0-9]/.test(newPw);
  const reqMatch   = newPw.length > 0 && newPw === confirmPw;

  async function handleChangePassword() {
    if (!req8char || !reqSpecial || !reqNumber || !reqMatch) return;
    setPwSaving(true); setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwMsg(`Error: ${error.message}`); }
    else {
      setPwMsg("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
    setTimeout(() => setPwMsg(""), 4000);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const inputStyle: CSSProperties = {
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${t.cardBorder}`,
    borderRadius: 8, fontSize: 14, fontFamily: "inherit",
    background: t.inputBg ?? t.cardBg, color: t.text,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
    color: t.text3, marginBottom: 6, display: "block",
  };

  const sideTabStyle = (active: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "12px 14px",
    borderRadius: 10, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 14, fontWeight: active ? 700 : 500,
    background: active ? t.green : "transparent",
    color: active ? "#fff" : t.text,
    textAlign: "left", transition: "background 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Pharmacist</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: t.green, lineHeight: 1.1 }}>Settings</div>
        <div style={{ fontSize: 13, color: t.text3, marginTop: 2 }}>{dateStr}</div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 220, background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 14, padding: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: t.text3, marginBottom: 12 }}>SETTINGS</div>

          {/* User card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            background: t.hoverBg ?? "rgba(0,0,0,0.03)",
            marginBottom: 14,
          }}>
            <img src={photoUrl} alt="Profile" style={{
              width: 38, height: 38, borderRadius: "50%",
              objectFit: "cover", objectPosition: "center top",
              border: `2px solid ${t.green}`,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{username}</div>
              <div style={{ fontSize: 11, color: t.text3 }}>{ROLE.toLowerCase()}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button style={sideTabStyle(tab === "profile")} onClick={() => setTab("profile")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              User Profile
            </button>
            <button style={sideTabStyle(tab === "password")} onClick={() => setTab("password")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Password
            </button>
          </div>
        </div>

        {/* ── Main panel ── */}
        <div style={{ flex: 1, display: "flex", gap: 20 }}>

          <div style={{
            flex: 1, background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14, padding: "28px 32px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
          }}>

            {tab === "profile" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>User Profile</div>
                  <div style={{ fontSize: 13, color: t.text3, marginTop: 4 }}>Update your display name, email, and profile photo.</div>
                </div>

                {/* Photo */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                  <img src={photoUrl} alt="Profile" style={{
                    width: 80, height: 80, borderRadius: "50%",
                    objectFit: "cover", objectPosition: "center top",
                    border: `3px solid ${t.green}`,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 8 }}>Profile Photo</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => fileRef.current?.click()}
                        style={{
                          background: t.green, color: "#fff", border: "none",
                          borderRadius: 8, padding: "8px 16px",
                          fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        🖼️ Change Photo
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 6 }}>JPG, PNG, GIF or WEBP · Max 5 MB</div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
                  </div>
                </div>

                {/* Fields */}
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>USERNAME</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>EMAIL</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} type="email" />
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={labelStyle}>ROLE</label>
                  <input value={ROLE} readOnly style={{ ...inputStyle, background: t.hoverBg ?? "rgba(0,0,0,0.03)", color: t.text3, cursor: "not-allowed" }} />
                </div>

                {saveMsg && (
                  <div style={{
                    marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
                    background: saveMsg.startsWith("Error") ? "#fdecea" : "#e8f5e9",
                    color:      saveMsg.startsWith("Error") ? "#c0392b" : "#2db357",
                    fontWeight: 600,
                  }}>{saveMsg}</div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    background: t.green, color: "#fff", border: "none",
                    borderRadius: 10, padding: "12px 28px",
                    fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: saving ? 0.7 : 1,
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  ✓ {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            )}

            {tab === "password" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Change Password</div>
                  <div style={{ fontSize: 13, color: t.text3, marginTop: 4 }}>Your new password must meet all the requirements on the right.</div>
                </div>

                {/* Current password */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>CURRENT PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCur ? "text" : "password"}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      placeholder="Enter current password"
                    />
                    <button onClick={() => setShowCur(v => !v)} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: t.text3, padding: 0,
                    }}><EyeIcon visible={showCur} /></button>
                  </div>
                </div>

                {/* New password */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      placeholder="Enter new password"
                    />
                    <button onClick={() => setShowNew(v => !v)} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: t.text3, padding: 0,
                    }}><EyeIcon visible={showNew} /></button>
                  </div>
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 28 }}>
                  <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConf ? "text" : "password"}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      placeholder="Confirm new password"
                    />
                    <button onClick={() => setShowConf(v => !v)} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: t.text3, padding: 0,
                    }}><EyeIcon visible={showConf} /></button>
                  </div>
                </div>

                {pwMsg && (
                  <div style={{
                    marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
                    background: pwMsg.startsWith("Error") ? "#fdecea" : "#e8f5e9",
                    color:      pwMsg.startsWith("Error") ? "#c0392b" : "#2db357",
                    fontWeight: 600,
                  }}>{pwMsg}</div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !req8char || !reqSpecial || !reqNumber || !reqMatch}
                  style={{
                    background: t.green, color: "#fff", border: "none",
                    borderRadius: 10, padding: "12px 28px",
                    fontWeight: 700, fontSize: 14,
                    cursor: (pwSaving || !req8char || !reqSpecial || !reqNumber || !reqMatch) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: (pwSaving || !req8char || !reqSpecial || !reqNumber || !reqMatch) ? 0.55 : 1,
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  🔒 {pwSaving ? "Changing…" : "Change Password"}
                </button>
              </>
            )}
          </div>

          {/* ── Requirements panel (password tab only) ── */}
          {tab === "password" && (
            <div style={{
              width: 200, background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 14, padding: "20px 18px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              alignSelf: "flex-start", flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: t.text3, marginBottom: 14 }}>REQUIREMENTS</div>
              <RequirementRow ok={req8char}   label="At least 8 characters" />
              <RequirementRow ok={reqSpecial} label={`One special char (!@#$%^&*?)`} />
              <RequirementRow ok={reqNumber}  label="One number" />
              <RequirementRow ok={reqMatch}   label="Passwords match" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
