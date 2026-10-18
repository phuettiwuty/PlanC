import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import campusIllustration from "./assets/campus-illustration.svg";
import "./Home.css";

const GRADE_POINTS = {
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  "D+": 1.5,
  D: 1.0,
  F: 0.0,
};

const GENERATED_NOTIFICATIONS = new Set([
  "เปิดลงทะเบียนการศึกษา ภาคต้น 2569",
  "สถานะการเรียนปกติ ผลการเรียนล่าสุดได้รับการบันทึกเรียบร้อย",
]);

function getGradeNotifications(notifications) {
  if (!Array.isArray(notifications)) return [];
  return notifications.filter(
    (notification) => notification && !GENERATED_NOTIFICATIONS.has(notification.text),
  );
}

function isPassedGrade(grade) {
  if (!grade) return false;
  const g = String(grade).trim().toUpperCase();
  if (["F", "W", "DROP", "I", "U", "N"].includes(g)) return false;
  if (["A", "B+", "B", "C+", "C", "D+", "D", "P", "S"].includes(g)) return true;
  return false;
}

function findStudentNameDeep(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return "";

  const candidateKeys = [
    "stdNameTh", "std_name_th", "studentNameTh", "student_name_th",
    "stdName", "studentName", "student_name", "fullName", "full_name",
    "nameTh", "name_th", "thaiName", "thai_name",
    "stdNameEn", "studentNameEn", "nameEn", "name_en", "name"
  ];

  for (const k of candidateKeys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim() && !/^b\d+/i.test(val.trim())) {
      return val.trim();
    }
  }

  const first = obj.firstNameTh || obj.first_name_th || obj.firstName || obj.first_name;
  const last = obj.lastNameTh || obj.last_name_th || obj.lastName || obj.last_name;
  const title = obj.titleTh || obj.title_th || obj.title || "";
  if (first && typeof first === "string" && !/^b\d+/i.test(first.trim())) {
    return `${title}${first} ${last || ""}`.trim();
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      const res = findStudentNameDeep(obj[key], depth + 1);
      if (res) return res;
    }
  }

  return "";
}

function getSemesters(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [payload.results, payload.data, payload.result, payload.semesters];
  return candidates.find(Array.isArray) || [];
}

function courseValue(obj, names, fallback = "") {
  if (!obj || typeof obj !== "object") return fallback;
  for (const name of names) {
    if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") {
      return obj[name];
    }
  }
  return fallback;
}

function readCachedAcademicSummary(studentId) {
  if (!studentId) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(`ku-academic-summary-${studentId}`) || "null");
    if (
      !cached ||
      typeof cached !== "object" ||
      !Number.isFinite(cached.earnedCredits) ||
      !Number.isFinite(cached.totalCredits) ||
      !Number.isFinite(cached.remainingCredits)
    ) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

async function readResponsePayload(response) {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลผลการเรียนกลับมา");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("รูปแบบข้อมูลผลการเรียนจากเซิร์ฟเวอร์ไม่ถูกต้อง");
  }
}

function DrawerIcon({ type }) {
  const iconPaths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    plan: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4m8-4v4M3 9h18m-13 5 2 2 4-4" /></>,
    grades: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8m-8 4h8m-8 4h5" /></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  };

  return (
    <svg className="drawer-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {iconPaths[type]}
    </svg>
  );
}

export default function Home({ session, onLogout }) {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);

  // Student Profile State initialized from session
  const [profile, setProfile] = useState(() => {
    const std = session?.student || session?.user?.student || {};
    return {
      name:
        session?.name ||
        std.stdNameTh ||
        std.stdNameEn ||
        (std.titleTh && std.firstNameTh ? `${std.titleTh}${std.firstNameTh} ${std.lastNameTh || ""}`.trim() : "") ||
        std.name ||
        "",
      stdCode: session?.stdCode || std.stdCode || std.stdId || session?.username || session?.idcode || "",
      status: session?.status || std.stdStatusDescTh || std.status || "ปกติ",
      faculty: session?.faculty || std.facultyNameTh || std.faculty || "",
      major: session?.major || std.majorNameTh || std.major || "",
    };
  });

  // Academic Summary State
  const [stats, setStats] = useState(() => {
    const cached = readCachedAcademicSummary(session?.idcode);
    return {
      earnedCredits: cached?.earnedCredits ?? null,
      totalCredits: cached?.totalCredits ?? 144,
      remainingCredits: cached?.remainingCredits ?? null,
      gpax: cached?.gpax ?? "—",
      status: cached?.status ?? "—",
      notifications: getGradeNotifications(cached?.notifications),
      isLoading: true,
      error: "",
    };
  });

  // Fetch real student profile and real grades from API
  useEffect(() => {
    if (!session?.idcode || !session?.token) return;

    const controller = new AbortController();

    async function loadRealData() {
      try {
        // 1. Fetch Profile info
        let resolvedName = profile.name;
        let resolvedCode = profile.stdCode;
        let resolvedStatus = profile.status;

        try {
          const profRes = await fetch(`/api/profile?idcode=${encodeURIComponent(session.idcode)}`, {
            headers: { "x-access-token": session.token },
            signal: controller.signal,
          });
          if (profRes.ok) {
            const profData = await readResponsePayload(profRes);
            const foundFromProf = findStudentNameDeep(profData);
            if (foundFromProf) resolvedName = foundFromProf;
          }
        } catch {
          // Profile endpoint fallback
        }

        // 2. Fetch Grades data
        const gradesRes = await fetch(`/api/grades?idcode=${encodeURIComponent(session.idcode)}`, {
          headers: { "x-access-token": session.token },
          signal: controller.signal,
        });

        if (gradesRes.ok) {
          const gradesData = await readResponsePayload(gradesRes);
          if (!Array.isArray(gradesData) && (!gradesData || typeof gradesData !== "object")) {
            throw new Error("ไม่พบข้อมูลผลการเรียนที่ใช้งานได้");
          }

          // Deep search for real student name in grades response
          const foundFromGrades = findStudentNameDeep(gradesData);
          if (foundFromGrades && !resolvedName) {
            resolvedName = foundFromGrades;
          }

          // Calculate Academic Summary
          const semesters = getSemesters(gradesData);
          const earnedCreditsByCourse = new Map();
          let earnedCreditsWithoutCode = 0;
          let totalPoints = 0;
          let totalGradedCredits = 0;
          const failedCourses = [];
          const withdrawnCourses = [];

          for (const sem of semesters) {
            const courses = sem.grade || sem.grades || sem.courses || [];
            for (const c of courses) {
              const cr = parseFloat(courseValue(c, ["credit", "credits", "credit_hour", "creditHours"], 0)) || 0;
              const grade = String(courseValue(c, ["grade", "grade_result", "result"], "")).trim();
              const code = courseValue(c, ["subjectcode", "subject_code", "coursecode", "course_code", "code"], "");
              const name = courseValue(c, ["subjectname", "subject_name", "subject_name_th", "coursename", "name"], "");

              if (GRADE_POINTS[grade] !== undefined) {
                totalGradedCredits += cr;
                totalPoints += cr * GRADE_POINTS[grade];
              }

              if (isPassedGrade(grade)) {
                const courseCode = String(code).trim();
                if (courseCode) {
                  earnedCreditsByCourse.set(
                    courseCode,
                    Math.max(earnedCreditsByCourse.get(courseCode) || 0, cr)
                  );
                } else {
                  earnedCreditsWithoutCode += cr;
                }
              }

              if (grade.toUpperCase() === "F") {
                failedCourses.push({ code, name });
              } else if (grade.toUpperCase() === "W") {
                withdrawnCourses.push({ code, name });
              }
            }
          }

          // Check if latest semester has precalculated values
          const latestSem = semesters.length > 0 ? semesters[semesters.length - 1] : null;
          const apiGpax = latestSem
            ? parseFloat(courseValue(latestSem, ["gpax", "gpa_cumulative", "gpa_accumulate", "cumulative_gpa"], 0))
            : 0;

          const calculatedGpax = totalGradedCredits > 0 ? totalPoints / totalGradedCredits : 0;
          const finalGpax = apiGpax > 0 ? apiGpax : calculatedGpax;

          const finalEarned =
            earnedCreditsWithoutCode +
            [...earnedCreditsByCourse.values()].reduce((total, credits) => total + credits, 0);

          const totalCurriculum = 144;
          const remaining = Math.max(0, totalCurriculum - finalEarned);
          const computedStatus = finalGpax >= 2.0 || finalEarned === 0 ? "ปกติ" : "รอพินิจ";

          // Generate Notifications from real data
          const notifs = [];
          if (withdrawnCourses.length > 0) {
            notifs.push({
              type: "red",
              text: `การถอนวิชา ${withdrawnCourses[0].code} อาจส่งผลต่อวิชาต่อเนื่อง`,
            });
          }
          if (failedCourses.length > 0) {
            notifs.push({
              type: "yellow",
              text: `พบวิชา ${failedCourses[0].code} ไม่ผ่านในการศึกษา (ต้องลงทะเบียนเรียนซ้ำ)`,
            });
          }
          const summary = {
            earnedCredits: finalEarned,
            totalCredits: totalCurriculum,
            remainingCredits: remaining,
            gpax: finalGpax > 0 ? finalGpax.toFixed(2) : "—",
            status: resolvedStatus || computedStatus,
            notifications: notifs,
            isLoading: false,
            error: "",
          };
          setStats(summary);
          try {
            sessionStorage.setItem(
              `ku-academic-summary-${session.idcode}`,
              JSON.stringify({ ...summary, savedAt: Date.now() }),
            );
          } catch (storageError) {
            console.error("Unable to cache academic summary:", storageError);
          }
        } else {
          const errorData = await readResponsePayload(gradesRes).catch(() => null);
          throw new Error(errorData?.error || `ไม่สามารถดึงข้อมูลผลการเรียนได้ (HTTP ${gradesRes.status})`);
        }

        // Update profile state
        if (resolvedName || resolvedCode) {
          setProfile((prev) => {
            const next = {
              ...prev,
              name: resolvedName || prev.name,
              stdCode: resolvedCode || prev.stdCode,
              status: resolvedStatus || prev.status,
            };
            // Sync updated info into sessionStorage
            try {
              const current = JSON.parse(sessionStorage.getItem("ku-session") || "{}");
              sessionStorage.setItem(
                "ku-session",
                JSON.stringify({ ...current, name: next.name, stdCode: next.stdCode, status: next.status })
              );
            } catch {
              // Ignore session storage error
            }
            return next;
          });
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to load real student data:", err);
          const cached = readCachedAcademicSummary(session.idcode);
          setStats((prev) => {
            const hasCachedSummary = prev.earnedCredits !== null || cached !== null;
            return {
              ...prev,
              ...(cached
                ? {
                    earnedCredits: cached.earnedCredits,
                    totalCredits: cached.totalCredits,
                    remainingCredits: cached.remainingCredits,
                    gpax: cached.gpax,
                    status: cached.status,
                    notifications: getGradeNotifications(cached.notifications).length > 0
                      ? getGradeNotifications(cached.notifications)
                      : prev.notifications,
                  }
                : {}),
              isLoading: false,
              error: hasCachedSummary
                ? "กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้ เนื่องจากโหลดข้อมูลใหม่ไม่สำเร็จ"
                : err.message || "ไม่สามารถดึงข้อมูลผลการเรียนได้",
            };
          });
        }
      } finally {
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    }

    loadRealData();
    return () => controller.abort();
  }, [session?.idcode, session?.token]);

  const userCode = (profile.stdCode || session?.username || session?.idcode || "").trim();
  const userName = (profile.name || "").trim();

  // Clean Topbar Display Name: NEVER duplicate the student ID
  const userHeaderText = (() => {
    if (userName && !/^b\d+/i.test(userName)) {
      return userCode ? `${userName} ${userCode}` : userName;
    }
    return userCode ? `นิสิต ${userCode}` : "นิสิต";
  })();

  // Greeting Name: User's first name, or fallback to userCode
  const greetingName = (() => {
    if (userName && !/^b\d+/i.test(userName)) {
      const clean = userName.replace(/^(?:นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|mr\.|mrs\.|ms\.)\s*/i, "");
      const firstWord = clean.split(/\s+/)[0];
      if (firstWord) return firstWord;
    }
    return userCode || "คุณ";
  })();

  return (
    <div className="home-page">
      {/* Top Navigation Bar matching PlanC Design */}
      <header className="home-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="menu-toggle-btn"
            aria-label="เปิดเมนู"
            onClick={() => setShowNavDrawer(!showNavDrawer)}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          <NavLink to="/dashboard" className="home-brand">
            <span className="brand-name">PlanC</span>
            <svg viewBox="0 0 40 30" className="brand-cap" aria-hidden="true">
              <path d="M2 8 20 2l18 6-18 7L2 8Z" />
              <path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" />
              <path d="M36 9v11" />
            </svg>
          </NavLink>
        </div>

        <div className="topbar-right">
          <div className="user-profile-dropdown">
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
            >
              <svg viewBox="0 0 24 24" className="user-avatar-icon" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
              <span className="user-fullname">{userHeaderText}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="dropdown-caret" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-menu-popover">
                <div className="user-menu-header">
                  <strong>{userName || userCode}</strong>
                  <span>รหัสนิสิต: {userCode}</span>
                  {profile.faculty && <span>คณะ: {profile.faculty}</span>}
                  {profile.major && <span>สาขา: {profile.major}</span>}
                </div>
                <hr />
                <button
                  type="button"
                  className="user-menu-item logout-action"
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Mobile/Drawer Navigation */}
      {showNavDrawer && (
        <div className="nav-drawer-backdrop" onClick={() => setShowNavDrawer(false)}>
          <aside className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-brand">PlanC</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setShowNavDrawer(false)}
                aria-label="ปิดเมนู"
              >
                ✕
              </button>
            </div>
            <nav className="drawer-nav">
              <NavLink to="/dashboard" onClick={() => setShowNavDrawer(false)}>
                <DrawerIcon type="home" />
                <span>หน้าหลัก</span>
              </NavLink>
              <NavLink to="/study-plan" onClick={() => setShowNavDrawer(false)}>
                <DrawerIcon type="plan" />
                <span>วางแผนการเรียน</span>
              </NavLink>
              <NavLink to="/grades" onClick={() => setShowNavDrawer(false)}>
                <DrawerIcon type="grades" />
                <span>เช็ควิชาและหน่วยกิต</span>
              </NavLink>
              <NavLink to="/cooperative-plan" onClick={() => setShowNavDrawer(false)}>
                <DrawerIcon type="calculator" />
                <span>คำนวณสหกิต</span>
              </NavLink>
              <NavLink
                to="/profile"
                className="drawer-profile-link"
                onClick={() => setShowNavDrawer(false)}
              >
                <DrawerIcon type="profile" />
                <span>โปรไฟล์</span>
              </NavLink>
            </nav>
            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-logout-btn"
                onClick={() => {
                  setShowNavDrawer(false);
                  if (onLogout) onLogout();
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Home Content Container */}
      <main className="home-container">
        {/* 1. Hero Welcome Banner */}
        <section className="welcome-banner">
          <div className="banner-text-content">
            <span className="banner-greeting-en">Welcome Back,</span>
            <h1 className="banner-greeting-th">
              สวัสดี คุณ{greetingName} <span className="wave-hand-emoji" role="img" aria-label="โบกมือ">✋</span>
            </h1>
          </div>

          <div className="banner-illustration-wrap">
            <img
              src={campusIllustration}
              alt="มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตศรีราชา"
              className="banner-illustration-img"
            />
          </div>
        </section>

        {/* 2. Top Action Cards Row */}
        <section className="action-cards-grid" aria-label="เมนูลัดหลัก">
          {/* Action Card 1: วางแผนการเรียน */}
          <NavLink to="/study-plan" className="action-card card-green">
            <div className="action-icon-box">
              <svg viewBox="0 0 24 24" className="action-icon" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="3" strokeWidth="2" stroke="currentColor" fill="none" />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" stroke="currentColor" />
                <circle cx="8" cy="14" r="1.5" fill="currentColor" />
                <circle cx="12" cy="14" r="1.5" fill="currentColor" />
                <circle cx="16" cy="14" r="1.5" fill="currentColor" />
                <circle cx="8" cy="18" r="1.5" fill="currentColor" />
                <circle cx="12" cy="18" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="action-text">
              <h2 className="action-title">วางแผนการเรียน</h2>
              <p className="action-subtitle">วางแผนการเรียนให้จบตามเป้าหมาย</p>
            </div>
          </NavLink>

          {/* Action Card 2: เช็ควิชาและหน่วยกิต */}
          <NavLink to="/grades" className="action-card card-blue">
            <div className="action-icon-box">
              <svg viewBox="0 0 24 24" className="action-icon" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeWidth="2" stroke="currentColor" fill="none" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeWidth="2" stroke="currentColor" fill="none" />
                <polyline points="9 10 12 13 18 7" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="action-text">
              <h2 className="action-title">เช็ควิชาและหน่วยกิต</h2>
              <p className="action-subtitle">ตรวจสอบเงื่อนไขรายวิชา และหน่วยกิตที่เหลือ</p>
            </div>
          </NavLink>

          {/* Action Card 3: คำนวณเกรดสหกิจ */}
          <NavLink to="/cooperative-plan" className="action-card card-purple">
            <div className="action-icon-box">
              <svg viewBox="0 0 24 24" className="action-icon" aria-hidden="true">
                <rect x="4" y="2" width="16" height="20" rx="3" strokeWidth="2" stroke="currentColor" fill="none" />
                <line x1="8" y1="6" x2="16" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="8" y1="10" x2="10" y2="10" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="14" y1="10" x2="16" y2="10" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="8" y1="14" x2="10" y2="14" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="14" y1="14" x2="16" y2="14" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="8" y1="18" x2="10" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <line x1="14" y1="18" x2="16" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
              </svg>
            </div>
            <div className="action-text">
              <h2 className="action-title">คำนวณเกรดสหกิจ</h2>
              <p className="action-subtitle">คำนวณ GPA ตามเกณฑ์สหกิจ</p>
            </div>
          </NavLink>
        </section>

        {/* 3. Bottom Section: 2 Columns */}
        <section className="dashboard-bottom-grid">
          {/* Left Column: สรุปข้อมูลการเรียน */}
          <article className="dashboard-panel panel-summary">
            <div className="panel-header">
              <svg viewBox="0 0 24 24" className="panel-title-icon green-icon" aria-hidden="true">
                <path d="M18 20V10" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
                <path d="M12 20V4" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
                <path d="M6 20v-6" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <h3 className="panel-title">สรุปข้อมูลการเรียน</h3>
            </div>

            {stats.error && stats.earnedCredits === null ? (
              <div className="dashboard-data-error" role="alert">{stats.error}</div>
            ) : <>
              {stats.error && <div className="dashboard-data-error" role="status">{stats.error}</div>}
              <div className="stats-2x2-grid">
              {/* Stat 1: หน่วยกิตสะสม */}
              <div className="stat-card stat-green">
                <div className="stat-icon-wrap">
                  <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
                    <path d="M2 7l10-4 10 4-10 4-10-4z" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinejoin="round" />
                    <path d="M6 10.5v5c4 3 8 3 12 0v-5" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">หน่วยกิตสะสม</span>
                  <strong className="stat-value">
                    {stats.isLoading ? "..." : `${stats.earnedCredits}/${stats.totalCredits}`}
                  </strong>
                </div>
              </div>

              {/* Stat 2: หน่วยกิตที่เหลือ */}
              <div className="stat-card stat-blue">
                <div className="stat-icon-wrap">
                  <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="18" rx="2" strokeWidth="1.8" stroke="currentColor" fill="none" />
                    <line x1="8" y1="8" x2="16" y2="8" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
                    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
                    <line x1="8" y1="16" x2="12" y2="16" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">หน่วยกิตที่เหลือ</span>
                  <strong className="stat-value">
                    {stats.isLoading ? "..." : `${stats.remainingCredits} หน่วยกิต`}
                  </strong>
                </div>
              </div>

              {/* Stat 3: เกรดเฉลี่ยสะสม */}
              <div className="stat-card stat-purple">
                <div className="stat-icon-wrap">
                  <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
                    <path d="M18 20V10" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                    <path d="M12 20V4" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                    <path d="M6 20v-6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">เกรดเฉลี่ยสะสม</span>
                  <strong className="stat-value">
                    {stats.isLoading ? "..." : stats.gpax}
                  </strong>
                </div>
              </div>

              {/* Stat 4: สถานะการเรียน */}
              <div className="stat-card stat-yellow">
                <div className="stat-icon-wrap">
                  <svg viewBox="0 0 24 24" className="stat-icon" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">สถานะการเรียน</span>
                  <strong className="stat-value">
                    {stats.isLoading ? "..." : stats.status}
                  </strong>
                </div>
              </div>
              </div>
            </>}
          </article>

          {/* Right Column: ประกาศ/แจ้งเตือน */}
          <article className="dashboard-panel panel-announcements">
            <div className="panel-header">
              <svg viewBox="0 0 24 24" className="panel-title-icon" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <h3 className="panel-title">ประกาศ/แจ้งเตือน</h3>
            </div>

            <div className="notifications-list">
              {stats.notifications.length > 0 ? (
                stats.notifications.map((notif, index) => (
                  <div key={index} className={`notification-pill alert-${notif.type}`}>
                    <span className="notification-dot"></span>
                    <span className="notification-text">{notif.text}</span>
                  </div>
                ))
              ) : (
                <p className="notifications-empty" role="status">
                  {stats.isLoading
                    ? "กำลังโหลดประกาศ/แจ้งเตือน..."
                    : "ยังไม่มีประกาศ/แจ้งเตือนในขณะนี้"}
                </p>
              )}
            </div>
          </article>
        </section>
      </main>

      {/* Footer Bar */}
      <footer className="home-footer">
        <button
          type="button"
          className="report-issue-btn"
          onClick={() => alert("ระบบแจ้งปัญหา: สามารถส่งเรื่องข้อผิดพลาดหรือข้อเสนอแนะถึงทีมพัฒนาระบบ PlanC")}
        >
          แจ้งปัญหา
        </button>
      </footer>
    </div>
  );
}
