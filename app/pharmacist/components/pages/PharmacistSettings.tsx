"use client";
import { CSSProperties, useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  initialTab: "profile" | "password";
  profilePhoto: string | null;
  profileUsername: string;
  onPhotoChange: (url: string | null) => void;
  onUsernameChange: (name: string) => void;
};

export default function PharmacistSettings({
  initialTab,
  profilePhoto,
  profileUsername,
  onPhotoChange,
  onUsernameChange,
}: Props) {
  const { t } = useTheme();
  const { user: authUser } = useAuth();

  const [tab, setTab]           = useState(initialTab);
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("pharmacist");
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);

  const [toast, setToast]         = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showCamera, setShowCamera] = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pwReq = {
    length:  newPw.length >= 8,
    special: /[!@#$%^&*?]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    match:   newPw.length > 0 && newPw === confirmPw,
  };

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  // Resolve userId
  useEffect(() => {
    if (authUser?.id) { setUserId(authUser.id); return; }
    try {
      const raw = localStorage.getItem("smartrhu_user");
      if (raw) { const p = JSON.parse(raw); if (p?.id) { setUserId(p.id); return; } }
    } catch {}
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
  }, [authUser]);

  useEffect(() => { if (userId) fetchProfile(userId); }, [userId]);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("users").select("username,email,avatar_url,role")
      .eq("user_id", uid).single();
    if (error) { showToastMsg("Failed to load profile.", "error"); return; }
    if (data) {
      onUsernameChange(data.username || "");
      setEmail(data.email || "");
      setRole(data.role || "pharmacist");
      if (data.avatar_url) onPhotoChange(`${data.avatar_url}?t=${Date.now()}`);
    }
  };

  const showToastMsg = (msg: string, type: "success" | "error") => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3500);
  };

  const getUid = () => userId || authUser?.id || (() => {
    try { const r = localStorage.getItem("smartrhu_user"); if (r) return JSON.parse(r)?.id; } catch {}
    return localStorage.getItem("userId");
  })();

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = getUid();
    if (!uid) { showToastMsg("User not found. Please refresh.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToastMsg("File too large. Max 5 MB.", "error"); return; }
    onPhotoChange(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${uid}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadErr) { showToastMsg(`Upload error: ${uploadErr.message}`, "error"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await supabase.from("users").update({ avatar_url: publicUrl }).eq("user_id", uid);
      onPhotoChange(`${publicUrl}?t=${Date.now()}`);
      localStorage.setItem("userAvatar", publicUrl);
      window.dispatchEvent(new Event("avatarUpdated"));
      showToastMsg("Photo updated successfully!", "success");
    } catch { showToastMsg("Something went wrong.", "error"); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { showToastMsg("Camera access denied.", "error"); setShowCamera(false); }
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const uid = getUid(); if (!uid) return;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setUploading(true); stopCamera();
      const filePath = `${uid}/avatar.jpg`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadErr) { showToastMsg(`Upload error: ${uploadErr.message}`, "error"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await supabase.from("users").update({ avatar_url: publicUrl }).eq("user_id", uid);
      onPhotoChange(`${publicUrl}?t=${Date.now()}`);
      localStorage.setItem("userAvatar", publicUrl);
      window.dispatchEvent(new Event("avatarUpdated"));
      showToastMsg("Photo saved!", "success");
      setUploading(false);
    }, "image/jpeg", 0.9);
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profileUsername.trim()) { showToastMsg("Please enter a username.", "error"); return; }
    if (!email.trim())           { showToastMsg("Please enter an email.", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToastMsg("Please enter a valid email.", "error"); return; }
    const uid = getUid();
    if (!uid) { showToastMsg("User not found. Please refresh.", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("users")
      .update({ username: profileUsername.trim(), email: email.trim() }).eq("user_id", uid);
    setSaving(false);
    if (error) { showToastMsg("Error saving profile!", "error"); return; }
    localStorage.setItem("userName",  profileUsername.trim());
    localStorage.setItem("userEmail", email.trim());
    window.dispatchEvent(new Event("profileUpdated"));
    showToastMsg("Profile saved successfully!", "success");
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPw)     { showToastMsg("Please enter your current password.", "error"); return; }
    if (!pwReq.length)  { showToastMsg("Password must be at least 8 characters.", "error"); return; }
    if (!pwReq.special) { showToastMsg("Password must include a special character.", "error"); return; }
    if (!pwReq.number)  { showToastMsg("Password must include a number.", "error"); return; }
    if (!pwReq.match)   { showToastMsg("Passwords do not match.", "error"); return; }
    if (newPw === currentPw) { showToastMsg("New password must differ from current.", "error"); return; }
    setPwSaving(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInErr) { showToastMsg("Current password is incorrect.", "error"); setPwSaving(false); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (updateErr) { showToastMsg("Error changing password!", "error"); return; }
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    showToastMsg("Password changed successfully!", "success");
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inp: CSSProperties = {
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${t.cardBorder}`, borderRadius: 8,
    fontSize: 14, fontFamily: "inherit", background: t.cardBg,
    color: t.text, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };
  const lbl: CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
    color: t.text3, marginBottom: 6, display: "block", textTransform: "uppercase",
  };
  const sideTabStyle = (active: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "10px 12px", borderRadius: 9,
    border: "none", cursor: "pointer", fontFamily: "inherit",
    fontSize: 13, fontWeight: active ? 700 : 500,
    background: active ? t.green : "transparent",
    color: active ? "#fff" : t.text,
    textAlign: "left", transition: "background 0.15s", marginBottom: 4,
  });

  const initials = (profileUsername || authUser?.name || "P")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Pharmacist";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>Pharmacist</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: t.green, margin: "4px 0 0", lineHeight: 1 }}>Settings</h1>
        <p style={{ fontSize: 12, color: t.text3, marginTop: 6, marginBottom: 0 }}>{dateStr}</p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* Left nav */}
        <div style={{ width: 240, background: t.cardBg, borderRadius: 16, padding: "20px 16px", boxShadow: "0 1px 8px rgba(0,0,0,.07)", border: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14, paddingLeft: 4, marginTop: 0 }}>Settings</p>

          {/* User card */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: t.dispenseCard, borderRadius: 10, padding: "10px 12px", marginBottom: 20, border: `1px solid ${t.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: t.green + "22", flexShrink: 0, border: `2px solid ${t.green}` }}>
              {profilePhoto
                ? <img src={profilePhoto} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => onPhotoChange(null)} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: t.green }}>{initials}</div>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profileUsername || authUser?.name || "Pharmacist"}
              </div>
              <div style={{ fontSize: 11, color: t.text3 }}>{roleLabel}</div>
            </div>
          </div>

          <button style={sideTabStyle(tab === "profile")} onClick={() => setTab("profile")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            User Profile
          </button>
          <button style={sideTabStyle(tab === "password")} onClick={() => setTab("password")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Password
          </button>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 20 }}>
          <div style={{ flex: 1, background: t.cardBg, borderRadius: 16, padding: "36px 40px", boxShadow: "0 1px 8px rgba(0,0,0,.07)", border: `1px solid ${t.cardBorder}` }}>

            {/* ── PROFILE TAB ── */}
            {tab === "profile" && (
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>User Profile</div>
                  <div style={{ fontSize: 13, color: t.text3, marginTop: 4 }}>Update your display name, email, and profile photo.</div>
                </div>

                {/* Photo section */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", border: `3px solid ${t.green}`, background: t.green + "22" }}>
                      {profilePhoto
                        ? <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => onPhotoChange(null)} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: t.green }}>{initials}</div>
                      }
                    </div>
                    {uploading && (
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #fff", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Profile Photo</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: t.green, color: "#fff", border: "none", borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.7 : 1 }}>
                        📤 {uploading ? "Uploading…" : "Change Photo"}
                      </button>
                      <button type="button" onClick={openCamera} disabled={uploading}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: t.green, border: `1.5px solid ${t.green}`, borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        📷 Camera
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: t.text3, margin: 0 }}>JPG, PNG, GIF or WEBP · Max 5 MB</p>
                    <input key={profilePhoto ?? "no-photo"} ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  </div>
                </div>

                {/* Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px", marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>Username</label>
                    <input type="text" value={profileUsername} onChange={e => onUsernameChange(e.target.value)}
                      placeholder="Enter username" style={inp}
                      onFocus={e => (e.currentTarget.style.borderColor = t.green)}
                      onBlur={e  => (e.currentTarget.style.borderColor = t.cardBorder)} />
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Enter email" style={inp}
                      onFocus={e => (e.currentTarget.style.borderColor = t.green)}
                      onBlur={e  => (e.currentTarget.style.borderColor = t.cardBorder)} />
                  </div>
                </div>
                <div style={{ marginBottom: 32 }}>
                  <label style={lbl}>Role</label>
                  <input type="text" value={roleLabel} readOnly
                    style={{ ...inp, background: t.tableRowBorder, color: t.text3, cursor: "not-allowed" }} />
                </div>

                <button type="button" onClick={handleSaveProfile} disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 7, background: saving ? t.greenLight : t.green, color: "#fff", border: "none", borderRadius: 22, padding: "11px 30px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
                  {saving ? "⏳ Saving…" : "✓ Save Changes"}
                </button>
              </>
            )}

            {/* ── PASSWORD TAB ── */}
            {tab === "password" && (
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Change Password</div>
                  <div style={{ fontSize: 13, color: t.text3, marginTop: 4 }}>Your new password must meet all the requirements on the right.</div>
                </div>

                {([
                  { label: "Current Password",    value: currentPw, setter: setCurrentPw, show: showCur, toggle: () => setShowCur(v => !v), ph: "Enter current password" },
                  { label: "New Password",         value: newPw,     setter: setNewPw,     show: showNew, toggle: () => setShowNew(v => !v), ph: "Enter new password" },
                  { label: "Confirm New Password", value: confirmPw, setter: setConfirmPw, show: showConf,toggle: () => setShowConf(v => !v),ph: "Confirm new password" },
                ] as const).map(({ label, value, setter, show, toggle, ph }, i) => (
                  <div key={label} style={{ marginBottom: i < 2 ? 18 : 32 }}>
                    <label style={lbl}>{label}</label>
                    <div style={{ position: "relative" }}>
                      <input type={show ? "text" : "password"} value={value}
                        onChange={e => (setter as (v: string) => void)(e.target.value)}
                        placeholder={ph} style={{ ...inp, paddingRight: 44 }}
                        onFocus={e => (e.currentTarget.style.borderColor = t.green)}
                        onBlur={e  => (e.currentTarget.style.borderColor = t.cardBorder)} />
                      <button type="button" onClick={toggle}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: t.text3, padding: 0, display: "flex" }}>
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={handleChangePassword}
                  disabled={pwSaving || !pwReq.length || !pwReq.special || !pwReq.number || !pwReq.match}
                  style={{ display: "flex", alignItems: "center", gap: 7, background: t.green, color: "#fff", border: "none", borderRadius: 22, padding: "11px 30px", fontSize: 13, fontWeight: 700, cursor: (pwSaving || !pwReq.length || !pwReq.special || !pwReq.number || !pwReq.match) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (pwSaving || !pwReq.length || !pwReq.special || !pwReq.number || !pwReq.match) ? 0.55 : 1 }}>
                  {pwSaving ? "⏳ Changing…" : "🔒 Change Password"}
                </button>
              </>
            )}
          </div>

          {/* Requirements panel */}
          {tab === "password" && (
            <div style={{ width: 220, background: t.dispenseCard, borderRadius: 16, padding: "24px 20px", boxShadow: "0 1px 6px rgba(0,0,0,.06)", flexShrink: 0, border: `1px solid ${t.border}`, alignSelf: "flex-start" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16, marginTop: 0 }}>Requirements</p>
              {([
                { met: pwReq.length,  label: "At least 8 characters" },
                { met: pwReq.special, label: "One special char (!@#$%^&*?)" },
                { met: pwReq.number,  label: "One number" },
                { met: pwReq.match,   label: "Passwords match" },
              ]).map(({ met, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1, border: `2px solid ${met ? t.green : t.border2}`, background: met ? t.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                    {met && <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 12, color: met ? t.green : t.text3, fontWeight: met ? 700 : 400, lineHeight: 1.4 }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: t.cardBg, borderRadius: 18, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.28)" }}>
            <div style={{ background: `linear-gradient(90deg,${t.green} 0%,${t.greenLight} 100%)`, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>📷 Take Photo</span>
              <button type="button" onClick={stopCamera} style={{ border: "none", background: "rgba(255,255,255,.2)", color: "#fff", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 10, background: "#000", display: "block" }} />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <div style={{ padding: "12px 22px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${t.cardBorder}` }}>
              <button type="button" onClick={stopCamera} style={{ background: t.surface2, color: t.text, border: "none", borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button type="button" onClick={capturePhoto} disabled={uploading}
                style={{ background: t.green, color: "#fff", border: "none", borderRadius: 20, padding: "8px 22px", fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.7 : 1 }}>
                {uploading ? "⏳ Saving…" : "📷 Capture"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 2000, background: toastType === "success" ? t.green : "#ef4444", color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 8px 24px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: 8, animation: "slideUp 0.25s ease" }}>
          {toastType === "success" ? "✓" : "✕"} {toast}
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}