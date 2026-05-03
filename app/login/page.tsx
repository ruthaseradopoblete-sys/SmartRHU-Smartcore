"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getRouteForRole } from "@/lib/supabase";
import { useAuth, AuthUser } from "@/context/AuthContext";
import styles from "./login.module.css";

type Screen = "access" | "member" | "admin" | "changepass";

function makeInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function LoginPage() {
  const router = useRouter();
  const { user: authUser, login } = useAuth(); // ← MOVED INSIDE component, added authUser

  const [screen, setScreen] = useState<Screen>("access");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Change password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");

  // Password conditions
  const pwConditions = [
    { label: "Must be 8 characters at least.", met: newPw.length >= 8 },
    { label: "Must have special characters e.g (!,@,#,$,%,&,*?).", met: /[!@#$%&*?]/.test(newPw) },
    { label: "Must have a number.", met: /\d/.test(newPw) },
  ];

  function reset() {
    setUsername(""); setPassword(""); setError("");
    setShowPass(false); setRemember(false);
  }

  async function handleSignIn(e: React.FormEvent, forAdmin = false) {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      let userRecord: any = null;

      // Try email login first
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: username.trim(), password,
      });

      if (!authErr) {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        const { data: profile, error: pe } = await supabase
          .from("users")
          .select("*")
          .eq("email", supaUser?.email ?? "")
          .single();
        if (pe || !profile) throw new Error("User profile not found.");
        userRecord = profile;
      } else {
        // Try username lookup
        const { data: list, error: qe } = await supabase
          .from("users")
          .select("*");
        if (qe) throw new Error("Database error. Check credentials.");

        const found = list?.find(
          (u: any) => u.email?.split("@")[0]?.toLowerCase() === username.toLowerCase().trim()
        );
        if (!found) throw new Error("User not found.");

        const { error: a2 } = await supabase.auth.signInWithPassword({
          email: found.email, password,
        });
        if (a2) throw new Error("Incorrect password.");
        userRecord = found;
      }

      // Role check
      const role = userRecord.role.toLowerCase();
      if (forAdmin && role !== "admin") throw new Error("Access denied. Admin only.");
      if (!forAdmin && role === "admin") throw new Error("Use the Admin login instead.");

      const loggedInUser: AuthUser = {
        id:           userRecord.user_id,
        name:         `${userRecord.first_name} ${userRecord.last_name}`,
        firstName:    userRecord.first_name,
        lastName:     userRecord.last_name,
        role:         role,
        initials:     makeInitials(userRecord.first_name, userRecord.last_name),
        email:        userRecord.email,
        isFirstLogin: userRecord.is_first_login,
      };

      login(loggedInUser);

      // First login → force change password
      if (userRecord.is_first_login) {
        setScreen("changepass");
        setLoading(false);
        return;
      }

      router.push(getRouteForRole(role));
    } catch (err: any) {
      setError(err.message ?? "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError(""); setCpLoading(true);

    try {
      if (!pwConditions.every(c => c.met))
        throw new Error("Password does not meet all conditions.");
      if (newPw !== confirmPw)
        throw new Error("Passwords do not match.");

      // 1. Get user from context FIRST before any signOut
      if (!authUser) throw new Error("Session expired. Please log in again.");

      // 2. Capture these NOW before signOut clears authUser
      const userEmail = authUser.email;
      const userRole  = authUser.role;
      const userId    = authUser.id;

      // 3. Update password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw new Error(updateErr.message);

      // 4. Mark is_first_login = false in DB
      const { error: dbErr } = await supabase
        .from("users")
        .update({ is_first_login: false })
        .eq("user_id", userId);

      // Log result to browser console so we can confirm it worked
      console.log("DB update error:", dbErr);
      if (dbErr) throw new Error("DB update failed: " + dbErr.message);

      // 5. Update context
      const updatedUser = { ...authUser, isFirstLogin: false };
      login(updatedUser);

      // 6. Sign out and re-authenticate with new password
      await supabase.auth.signOut();
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: userEmail,   // ← use captured value, not authUser (which is now null)
        password: newPw,
      });
      if (reAuthErr) throw new Error("Re-login failed: " + reAuthErr.message);

      // 7. Re-fetch profile to confirm is_first_login is now false
      const { data: freshProfile } = await supabase
        .from("users")
        .select("is_first_login")
        .eq("user_id", userId)
        .single();

      console.log("Fresh is_first_login:", freshProfile?.is_first_login);

      if (freshProfile?.is_first_login === true) {
        throw new Error("DB update did not save. Check Supabase RLS policies.");
      }

      // 8. Go to dashboard
      router.push(getRouteForRole(userRole));

    } catch (err: any) {
      setCpError(err.message);
    } finally {
      setCpLoading(false);
    }
  }

  const HeroPanel = () => (
    <div className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <p className={styles.heroWelcome}>Welcome to</p>
        <h1 className={styles.heroTitle}>
          SMART<span>RHU</span>
        </h1>
        <p className={styles.heroSub}>Inventory and Patient Management</p>
      </div>
    </div>
  );

  // ── Screen: Access Point ──
  if (screen === "access") return (
    <div className={styles.page}>
      <HeroPanel />
      <div className={styles.formPanel}>
        <div className={styles.formTop}>
          <img src="/logo.jpg" alt="Logo" className={styles.logo} />
          <p className={styles.logoSub}>Rural Healthcare Unit Lopez, Quezon</p>
          <div className={styles.divider} />
          <p className={styles.accessTitle}>Secure Access</p>
          <p className={styles.accessSub}>Select your access type to continue</p>
          <div className={styles.accessBtns}>
            <button className={styles.accessBtn} onClick={() => { reset(); setScreen("member"); }}>
              <div className={styles.accessBtnIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className={styles.accessBtnText}>
                <span className={styles.accessBtnTitle}>MEMBER</span>
                <span className={styles.accessBtnDesc}>For Staffs</span>
              </div>
              <div className={styles.accessBtnArrow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>

            <button className={styles.accessBtn} onClick={() => { reset(); setScreen("admin"); }}>
              <div className={styles.accessBtnIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className={styles.accessBtnText}>
                <span className={styles.accessBtnTitle}>ADMIN</span>
                <span className={styles.accessBtnDesc}>For Administrator Only</span>
              </div>
              <div className={styles.accessBtnArrow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
        <p className={styles.footer}>
          RHU Lopez Quezon © 2026<br />Department of Health — Philippines
        </p>
      </div>
    </div>
  );

  // ── Screen: Change Password ──
  if (screen === "changepass") return (
    <div className={styles.page}>
      <HeroPanel />
      <div className={styles.formPanel}>
        <div className={styles.formTop}>
          <img src="/logo.jpg" alt="Logo" className={styles.logo} />
          <p className={styles.logoSub}>Rural Healthcare Unit Lopez, Quezon</p>
          <div className={styles.divider} />
          <form className={styles.formInner} onSubmit={handleChangePassword}>
            <p className={styles.cpTitle}>CHANGE PASSWORD</p>
            {cpError && <div className={styles.errorBox}>{cpError}</div>}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Current Password:</label>
              <div className={styles.fieldWrap}>
                <input className={styles.fieldInput} type="text" value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)} required />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>New Password:</label>
              <div className={styles.fieldWrap}>
                <input className={styles.fieldInput}
                  type={showNew ? "text" : "password"}
                  value={newPw} onChange={e => setNewPw(e.target.value)} required
                  style={{ paddingRight: 40 }} />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(s => !s)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showNew
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Confirm Password:</label>
              <div className={styles.fieldWrap}>
                <input className={styles.fieldInput}
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                  style={{ paddingRight: 40 }} />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(s => !s)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showConfirm
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Conditions:</p>
            <ul className={styles.conditionList}>
              {pwConditions.map(c => (
                <li key={c.label} className={c.met ? styles.met : ""}>{c.label}</li>
              ))}
            </ul>

            <button className={styles.cpBtn} type="submit" disabled={cpLoading}>
              {cpLoading ? "Saving…" : "CHANGE PASSWORD"}
            </button>
            <button type="button" className={styles.backBtn} onClick={() => setScreen("access")}>
              ← Return to Access Point
            </button>
          </form>
        </div>
        <p className={styles.footer}>
          RHU Lopez Quezon © 2026<br />Department of Health — Philippines
        </p>
      </div>
    </div>
  );

  // ── Screen: Member or Admin Login ──
  const isAdmin = screen === "admin";
  return (
    <div className={styles.page}>
      <HeroPanel />
      <div className={styles.formPanel}>
        <div className={styles.formTop}>
          <img src="/logo.jpg" alt="Logo" className={styles.logo} />
          <p className={styles.logoSub}>Rural Healthcare Unit Lopez, Quezon</p>
          <div className={styles.divider} />
          <form
            className={styles.formInner}
            onSubmit={(e) => handleSignIn(e, isAdmin)}
          >
            <p className={styles.formRole}>{isAdmin ? "ADMINISTRATOR" : "MEMBER"}</p>
            <p className={styles.formRoleSub}>Enter your credentials to proceed</p>

            {error && (
              <div className={styles.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Username:</label>
              <input className={styles.fieldInput} type="text"
                value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" required />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Password:</label>
              <div className={styles.fieldWrap}>
                <input className={styles.fieldInput}
                  type={showPass ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required
                  style={{ paddingRight: 40 }} />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(s => !s)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPass
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.rememberRow}>
              <label className={styles.rememberLabel}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Remember Me
              </label>
              <button type="button" className={styles.forgotBtn}>Forgot Password?</button>
            </div>

            <button className={styles.signInBtn} type="submit" disabled={loading}>
              {loading ? "Signing in…" : "SIGN IN"}
            </button>

            <button type="button" className={styles.backBtn} onClick={() => { reset(); setScreen("access"); }}>
              ← Return to Access Point
            </button>
          </form>
        </div>
        <p className={styles.footer}>
          RHU Lopez Quezon © 2026<br />Department of Health — Philippines
        </p>
      </div>
    </div>
  );
}