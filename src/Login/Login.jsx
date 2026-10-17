import { useState } from "react";
import { useNavigate } from "react-router-dom";
import studentIllustration from "./assets/student-illustration.png?v=2";
import "./Login.css";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.accesstoken) {
        throw new Error(data.error || data.message || "เข้าสู่ระบบไม่สำเร็จ");
      }

      const user = data.user || {};
      const student = user.student || data.student || user || data;
      const resolvedName =
        student.stdNameTh ||
        user.stdNameTh ||
        data.stdNameTh ||
        (student.firstNameTh ? `${student.titleTh || ""}${student.firstNameTh} ${student.lastNameTh || ""}`.trim() : "") ||
        (user.firstNameTh ? `${user.titleTh || ""}${user.firstNameTh} ${user.lastNameTh || ""}`.trim() : "") ||
        student.stdNameEn ||
        user.stdNameEn ||
        (user.firstName && !user.firstName.startsWith("b6") ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
        (student.name && !student.name.startsWith("b6") ? student.name : "") ||
        (data.name && !data.name.startsWith("b6") ? data.name : "") ||
        "";

      const session = {
        username,
        idcode:
          data.idcode ||
          student.idcode ||
          student.idCode ||
          student.stdId ||
          student.stdCode ||
          username.replace(/^[bB](?=\d)/, ""),
        token: data.accesstoken,
        name: resolvedName,
        stdCode: student.stdCode || student.stdId || student.studentCode || username,
        faculty: student.facultyNameTh || student.faculty || "",
        major: student.majorNameTh || student.major || "",
        status: student.stdStatusDescTh || student.status || "ปกติ",
        student,
        user: data.user,
      };
      sessionStorage.setItem("ku-session", JSON.stringify(session));
      onLogin(session);
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-split-card">
        {/* Left Side: Visual & Branding */}
        <div className="login-hero-side">
          <div className="hero-top-group">
            <div className="hero-brand">
              <span className="brand-logo-text">PlanC</span>
              <svg viewBox="0 0 40 30" className="brand-cap-icon" aria-hidden="true">
                <path d="M2 8 20 2l18 6-18 7L2 8Z" />
                <path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" />
                <path d="M36 9v11" />
              </svg>
            </div>

            <div className="hero-copy">
              <p className="hero-subheading">
                ระบบวางแผนการเรียนและตรวจสอบรายวิชา<br />
                สำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์
              </p>
            </div>
          </div>

          <div className="hero-illustration-container">
            <img
              src={studentIllustration}
              alt="KU Student Mascot"
              className="hero-illustration-img"
            />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-form-side">
          <div className="login-form-inner">
            <div className="mobile-brand-header">
              <span className="brand-logo-text">PlanC</span>
              <svg viewBox="0 0 40 30" className="brand-cap-icon" aria-hidden="true">
                <path d="M2 8 20 2l18 6-18 7L2 8Z" />
                <path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" />
                <path d="M36 9v11" />
              </svg>
            </div>

            <div className="login-card-header">
              <h2>เข้าสู่ระบบ</h2>
              <p className="login-subtitle">ยินดีต้อนรับเข้าสู่ระบบ PlanC</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="username">รหัสนิสิต</label>
                <div className="login-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20" />
                  </svg>
                  <input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="เช่น b6xxxxxxxx"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">รหัสผ่านบัญชีนนทรี</label>
                <div className="login-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="xxxxxxxxxx"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="login-error-alert" role="alert">
                  <svg viewBox="0 0 24 24" className="error-icon" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="btn-loading-state">
                    <span className="spinner"></span>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  <span>เข้าสู่ระบบ</span>
                )}
              </button>
            </form>

            <div className="login-card-footer">
              <p>บัญชีเข้าใช้งานเดียวกับ KU All-Login / Nontri Account</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
