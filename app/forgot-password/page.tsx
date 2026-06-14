"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/utils/auditLogs";
// NOTE: adjust this path if your login page lives somewhere else.
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  // ─────────────────────────────────────────────────────────────
  //  SEND RESET EMAIL
  // ─────────────────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      const input = email.trim().toLowerCase();
      if (!input) throw new Error("Please enter your email or username.");

      // Allow either a full email OR a username (email prefix), just like sign-in.
      let fullEmail = input;
      if (!input.includes("@")) {
        const { data: list, error: qe } = await supabase
          .from("users").select("email");
        if (qe) throw new Error("Database error. Please try again.");
        const found = list?.find(
          (u: any) => u.email?.split("@")[0]?.toLowerCase() === input
        );
        if (!found) throw new Error("No account found for that username.");
        fullEmail = found.email;
      }

      // Supabase sends a recovery email containing a link to /reset-password.
      // Make sure this redirect URL is whitelisted in:
      //   Supabase → Authentication → URL Configuration → Redirect URLs
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        fullEmail,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetErr) throw new Error(resetErr.message);

      // Audit log — success
      await logAction({
        user_name:   fullEmail,
        user_role:   "—",
        action:      "FORGOT_PASSWORD",
        module:      "Auth",
        description: `Password reset email requested for ${fullEmail}`,
        status:      "success",
      });

      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Could not send reset email.");

      // Audit log — failure
      await logAction({
        user_name:   email.trim() || "Unknown",
        user_role:   "—",
        action:      "FORGOT_PASSWORD",
        module:      "Auth",
        description: `Failed reset request: ${email.trim()} — ${err.message}`,
        status:      "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  UI HELPERS  (kept local to mirror the login page)
  // ─────────────────────────────────────────────────────────────
  const HeroPanel = () => (
    <div className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <p className={styles.heroWelcome}>Welcome to</p>
        <h1 className={styles.heroTitle}>SMART<span>RHU</span></h1>
        <p className={styles.heroSub}>Inventory and Patient Management</p>
      </div>
    </div>
  );

  const LogoBlock = () => (
    <>
      <img src="/logo.jpg" alt="SMARTRHU Logo" className={styles.logo} />
      <p className={styles.logoSub}>Rural Healthcare Unit Lopez, Quezon</p>
      <div className={styles.divider} />
    </>
  );

  const Footer = () => (
    <p className={styles.footer}>
      RHU Lopez Quezon © 2026<br />Department of Health — Philippines
    </p>
  );

  // ─────────────────────────────────────────────────────────────
  //  SUCCESS STATE
  // ─────────────────────────────────────────────────────────────
  if (sent) return (
    <div className={styles.page}>
      <HeroPanel />
      <div className={styles.formPanel}>
        <div className={styles.formTop}>
          <LogoBlock />
          <div className={styles.formInner}>
            <p className={styles.cpTitle}>CHECK YOUR EMAIL</p>
            <p className={styles.formRoleSub} style={{ marginBottom: 16 }}>
              If an account exists for <strong>{email.trim()}</strong>, a password
              reset link has been sent. Please check your inbox (and spam folder).
            </p>
            <button
              type="button"
              className={styles.signInBtn}
              onClick={() => router.push("/login")}
            >
              BACK TO LOGIN
            </button>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  //  REQUEST FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <HeroPanel />
      <div className={styles.formPanel}>
        <div className={styles.formTop}>
          <LogoBlock />
          <form className={styles.formInner} onSubmit={handleReset}>
            <p className={styles.cpTitle}>FORGOT PASSWORD</p>
            <p className={styles.formRoleSub} style={{ marginBottom: 16 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className={styles.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email / Username:</label>
              <input
                className={styles.fieldInput}
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <button className={styles.signInBtn} type="submit" disabled={loading}>
              {loading ? "Sending…" : "SEND RESET LINK"}
            </button>

            <button type="button" className={styles.backBtn}
              onClick={() => router.push("/login")}>
              ← Return to Login
            </button>
          </form>
        </div>
        <Footer />
      </div>
    </div>
  );
}