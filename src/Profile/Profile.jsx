import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { findStudentStatus } from "../studentStatus";
import "./Profile.css";

const DEFAULT_GOALS = [
  "เรียนจบตามแผนการเรียน",
  "รักษาเกรด > 2.9",
  "เก็บหน่วยกิตให้ครบตามหลักสูตร",
  "เตรียมความพร้อมสำหรับทำงานหลังเรียนจบ",
];

const GRADE_POINTS = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findValueDeep(value, names, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return "";
  const expectedNames = names.map(normalizeKey);

  for (const [key, item] of Object.entries(value)) {
    if (
      expectedNames.includes(normalizeKey(key)) &&
      (typeof item === "string" || typeof item === "number") &&
      String(item).trim()
    ) {
      return String(item).trim();
    }
  }

  for (const item of Object.values(value)) {
    const found = findValueDeep(item, names, depth + 1);
    if (found) return found;
  }
  return "";
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function getEntryYearFromStudentCode(studentCode) {
  const digits = String(studentCode || "").replace(/\D/g, "");
  if (!/^[5-9]\d{8,9}$/.test(digits)) return "";
  return 2500 + Number(digits.slice(0, 2));
}

function getCurrentStudyYear(entryYear) {
  const admitted = Number(entryYear);
  if (!admitted) return "";
  return Math.max(1, new Date().getFullYear() + 543 - admitted + 1);
}

function loadAcademicSummary(studentId) {
  if (!studentId) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(`ku-academic-summary-${studentId}`) || "null");
    const completedCredits = firstValue(cached?.completedCredits, cached?.earnedCredits);
    if (
      !cached ||
      !Number.isFinite(Number(completedCredits)) ||
      !Number.isFinite(Number(cached.totalCredits)) ||
      !Number.isFinite(Number(cached.remainingCredits))
    ) {
      return null;
    }

    return {
      completedCredits: Number(completedCredits),
      remainingCredits: Number(cached.remainingCredits),
      totalCredits: Number(cached.totalCredits),
      gpax: cached.gpax || "—",
    };
  } catch {
    return null;
  }
}

function findStudentName(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return "";
  const nameKeys = [
    "stdNameTh", "std_name_th", "studentNameTh", "student_name_th",
    "stdName", "studentName", "student_name", "fullName", "full_name",
    "nameTh", "name_th", "thaiName", "thai_name",
  ];

  for (const key of nameKeys) {
    const name = value[key];
    if (typeof name === "string" && name.trim() && !/^b\d+/i.test(name.trim())) {
      return name.trim();
    }
  }

  const firstName = value.firstNameTh || value.first_name_th || value.firstName || value.first_name;
  const lastName = value.lastNameTh || value.last_name_th || value.lastName || value.last_name;
  const title = value.titleTh || value.title_th || value.title || "";
  if (typeof firstName === "string" && firstName.trim() && !/^b\d+/i.test(firstName.trim())) {
    return `${title}${firstName} ${lastName || ""}`.trim();
  }

  for (const item of Object.values(value)) {
    const found = findStudentName(item, depth + 1);
    if (found) return found;
  }
  return "";
}

function getSemesters(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  return [payload.results, payload.data, payload.result, payload.semesters].find(Array.isArray) || [];
}

function getCourseValue(course, keys, fallback = "") {
  for (const key of keys) {
    const value = course?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function summarizeGrades(payload) {
  const semesters = getSemesters(payload);
  const earnedCredits = new Map();
  let creditsWithoutCode = 0;
  let totalPoints = 0;
  let gradedCredits = 0;

  for (const semester of semesters) {
    const courses = semester.grade || semester.grades || semester.courses || [];
    for (const course of courses) {
      const credits = Number.parseFloat(
        getCourseValue(course, ["credit", "credits", "credit_hour", "creditHours"], 0),
      ) || 0;
      const grade = String(getCourseValue(course, ["grade", "grade_result", "result"])).trim().toUpperCase();
      const code = String(
        getCourseValue(course, ["subjectcode", "subject_code", "coursecode", "course_code", "code"]),
      ).trim();

      if (GRADE_POINTS[grade] !== undefined) {
        totalPoints += credits * GRADE_POINTS[grade];
        gradedCredits += credits;
      }
      if (["A", "B+", "B", "C+", "C", "D+", "D", "P", "S"].includes(grade)) {
        if (code) earnedCredits.set(code, Math.max(earnedCredits.get(code) || 0, credits));
        else creditsWithoutCode += credits;
      }
    }
  }

  const latestSemester = semesters[semesters.length - 1];
  const apiGpax = Number.parseFloat(
    getCourseValue(latestSemester, ["gpax", "gpa_cumulative", "gpa_accumulate", "cumulative_gpa"], 0),
  );
  const calculatedGpax = gradedCredits > 0 ? totalPoints / gradedCredits : 0;
  const completedCredits =
    creditsWithoutCode + [...earnedCredits.values()].reduce((total, credits) => total + credits, 0);
  const gpax = apiGpax > 0 ? apiGpax : calculatedGpax;
  const totalCredits = 144;

  return {
    completedCredits,
    remainingCredits: Math.max(0, totalCredits - completedCredits),
    totalCredits,
    gpax: gpax > 0 ? gpax.toFixed(2) : "—",
  };
}

async function fetchPayload(url, session, signal) {
  const response = await fetch(url, {
    headers: { "x-access-token": session.token },
    signal,
  });
  const body = await response.text();
  let payload;
  try {
    payload = body.trim() ? JSON.parse(body) : null;
  } catch {
    throw new Error("ข้อมูลจากเซิร์ฟเวอร์อยู่ในรูปแบบที่ไม่ถูกต้อง");
  }
  if (!response.ok) {
    throw new Error(payload?.error || `ไม่สามารถดึงข้อมูลได้ (HTTP ${response.status})`);
  }
  if (payload === null) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลกลับมา");
  }
  return payload;
}

function loadGoals(studentId) {
  try {
    const storageKey = `ku-profile-goals-${studentId}`;
    const migrationKey = `ku-profile-goals-migrated-${studentId}`;
    const savedGoals = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (Array.isArray(savedGoals)) {
      const goals = savedGoals.filter(
        (goal) =>
          goal &&
          typeof goal.id === "string" &&
          typeof goal.text === "string" &&
          typeof goal.checked === "boolean",
      );
      if (sessionStorage.getItem(migrationKey) !== "true") {
        const migratedGoals = goals.map((goal) =>
          goal.id === "default-0" && goal.checked ? { ...goal, checked: false } : goal,
        );
        sessionStorage.setItem(storageKey, JSON.stringify(migratedGoals));
        sessionStorage.setItem(migrationKey, "true");
        return migratedGoals;
      }
      return goals;
    }
  } catch {
    return null;
  }

  return null;
}

function ProfileIcon({ name, className = "" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    plan: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4m8-4v4M3 9h18m-13 5 2 2 4-4" /></>,
    grades: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8m-8 4h8m-8 4h5" /></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    cap: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="m12 12 8-8m-4 0h4v4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    credit: <><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></>,
    chart: <><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export default function Profile({ session, onLogout }) {
  const student = session?.student || session?.user?.student || {};
  const studentCode = firstValue(
    session?.stdCode,
    student.stdCode,
    student.stdId,
    student.studentCode,
    session?.username,
    session?.idcode,
  );
  const entryYear = firstValue(
    student.admitYear,
    student.admit_year,
    student.admissionYear,
    student.admission_year,
    student.entryYear,
    student.entry_year,
    student.stdAdmitYear,
    student.std_admit_year,
    student.enrollmentYear,
    student.enrollment_year,
    getEntryYearFromStudentCode(studentCode),
  );
  const [profile, setProfile] = useState({
    name: session?.name || student.stdNameTh || student.stdNameEn || student.name || "",
    studentCode,
    faculty: session?.faculty || student.facultyNameTh || student.faculty || "",
    major: session?.major || student.majorNameTh || student.major || "",
    year: firstValue(
      session?.year,
      session?.studyYear,
      session?.study_year,
      session?.classYear,
      session?.yearLevel,
      student.stdYear,
      student.std_year,
      student.studentYear,
      student.student_year,
      student.studyYear,
      student.study_year,
      student.classYear,
      student.class_year,
      student.yearOfStudy,
      student.year_of_study,
      student.studentClass,
      student.student_class,
      student.yearLevel,
      student.year_level,
      student.stdClassYear,
      student.std_class_year,
      student.gradeYear,
      getCurrentStudyYear(entryYear),
    ),
    entryYear,
    status: findStudentStatus(session),
  });
  const [stats, setStats] = useState(() =>
    loadAcademicSummary(session?.idcode) || {
      completedCredits: null,
      remainingCredits: null,
      totalCredits: 144,
      gpax: "—",
    },
  );
  const [isLoading, setIsLoading] = useState(Boolean(session?.idcode && session?.token));
  const [error, setError] = useState("");
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goals, setGoals] = useState(
    () =>
      loadGoals(session?.idcode || studentCode) ||
      DEFAULT_GOALS.map((text, index) => ({ id: `default-${index}`, text, checked: false })),
  );
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(`ku-profile-goals-${session?.idcode || studentCode}`, JSON.stringify(goals));
    } catch (storageError) {
      console.error("Unable to save profile goals:", storageError);
    }
  }, [goals, session?.idcode, studentCode]);

  useEffect(() => {
    if (!session?.idcode || !session?.token) return undefined;

    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      setError("");
      const [profileResult, gradesResult] = await Promise.allSettled([
        fetchPayload(`/api/profile?idcode=${encodeURIComponent(session.idcode)}`, session, controller.signal),
        fetchPayload(`/api/grades?idcode=${encodeURIComponent(session.idcode)}`, session, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const errors = [];
      let officialStatus = "";
      if (profileResult.status === "fulfilled") {
        const payload = profileResult.value;
        officialStatus = findStudentStatus(payload) || profile.status;
        const mergedProfile = {
          name: findStudentName(payload) || findStudentName(session) || profile.name,
          studentCode:
            findValueDeep(payload, ["stdCode", "stdId", "studentCode", "idcode", "std_code"]) ||
            profile.studentCode,
          faculty:
            findValueDeep(payload, ["facultyNameTh", "faculty", "facultyName", "faculty_name_th"]) || profile.faculty,
          major:
            findValueDeep(payload, ["majorNameTh", "major", "majorName", "programNameTh", "major_name_th"]) || profile.major,
          year: firstValue(
            findValueDeep(payload, [
              "stdYear", "studentYear", "studyYear", "classYear", "yearLevel", "stdClassYear",
              "std_year", "student_year", "study_year", "class_year", "year_level", "std_class_year",
              "gradeYear", "grade_year", "yearOfStudy", "year_of_study", "studentClass", "student_class",
            ]),
            profile.year,
            getCurrentStudyYear(profile.entryYear || entryYear),
          ),
          entryYear: firstValue(
            findValueDeep(payload, [
              "admitYear", "admissionYear", "entryYear", "stdAdmitYear", "enrollmentYear",
              "admit_year", "admission_year", "entry_year", "std_admit_year", "enrollment_year",
            ]),
            profile.entryYear,
            entryYear,
          ),
          status: officialStatus,
        };
        setProfile(mergedProfile);
      } else {
        errors.push(`ข้อมูลประวัติ: ${profileResult.reason.message || "ไม่สามารถดึงข้อมูลได้"}`);
      }

      if (gradesResult.status === "fulfilled") {
        const summary = summarizeGrades(gradesResult.value);
        setStats(summary);
        try {
          sessionStorage.setItem(
            `ku-academic-summary-${session.idcode}`,
            JSON.stringify({
              completedCredits: summary.completedCredits,
              earnedCredits: summary.completedCredits,
              totalCredits: summary.totalCredits,
              remainingCredits: summary.remainingCredits,
              gpax: summary.gpax,
              status: officialStatus || "—",
              savedAt: Date.now(),
            }),
          );
        } catch (storageError) {
          console.error("Unable to cache academic summary:", storageError);
        }
      } else {
        const cachedSummary = loadAcademicSummary(session.idcode);
        if (cachedSummary) {
          setStats(cachedSummary);
        }
        errors.push(
          `ผลการเรียน: ${gradesResult.reason.message || "ไม่สามารถดึงข้อมูลได้"}${
            cachedSummary ? " (กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้)" : ""
          }`,
        );
      }

      setError(errors.join(" "));
      setIsLoading(false);
    }

    loadProfile();
    return () => controller.abort();
  }, [session?.idcode, session?.token]);

  const navigation = [
    { to: "/dashboard", label: "หน้าหลัก", icon: "home" },
    { to: "/study-plan", label: "วางแผนการเรียน", icon: "plan" },
    { to: "/grades", label: "เช็ควิชาและหน่วยกิต", icon: "grades" },
    { to: "/cooperative-plan", label: "คำนวณสหกิจ", icon: "calculator" },
    { to: "/profile", label: "โปรไฟล์", icon: "profile" },
  ];

  function closeNavigationAfterClick() {
    setIsNavOpen(false);
  }

  return (
    <div className="profile-page">
      {isNavOpen && (
        <div className="nav-drawer-backdrop" onClick={() => setIsNavOpen(false)}>
          <aside className="nav-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-brand">PlanC</span>
              <button
                type="button"
                className="drawer-close-btn"
                aria-label="ปิดเมนู"
                onClick={() => setIsNavOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="drawer-nav" aria-label="เมนูหลัก">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/profile"}
                  className={({ isActive }) =>
                    `${item.to === "/profile" ? "drawer-profile-link" : ""}${isActive ? " active" : ""}`
                  }
                  onClick={closeNavigationAfterClick}
                >
                  <ProfileIcon name={item.icon} className="drawer-nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="drawer-footer">
              <button type="button" className="drawer-logout-btn" onClick={onLogout}>ออกจากระบบ</button>
            </div>
          </aside>
        </div>
      )}

      <div className="profile-content">
        <header className="home-topbar profile-home-topbar">
          <div className="topbar-container">
            <div className="topbar-left">
              <button
                type="button"
                className="menu-toggle-btn"
                aria-label="เปิดเมนู"
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen(true)}
              >
                <span className="hamburger-line" />
                <span className="hamburger-line" />
                <span className="hamburger-line" />
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
          </div>
        </header>

        <section className="profile-heading">
          <div className="profile-heading-group">
            <h1>ข้อมูลส่วนตัว</h1>
            <p>ข้อมูลประวัตินิสิตและภาพรวมผลการศึกษา</p>
          </div>
        </section>

        <div className="profile-main-content">
          <section className="profile-identity-card" aria-label="ข้อมูลนิสิต">
            <div className="profile-card-banner"></div>
            <div className="profile-card-body">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar" aria-hidden="true">
                  <ProfileIcon name="profile" />
                </div>
              </div>
              <div className="profile-identity">
                <div className="profile-name-row">
                  <h2>{profile.name || "ไม่พบชื่อผู้ใช้"}</h2>
                  <span className="profile-code-badge">รหัสนิสิต {profile.studentCode || "—"}</span>
                </div>
                <div className="profile-chips-grid">
                  <div className="profile-chip">
                    <ProfileIcon name="profile" />
                    <span>ชั้นปีที่ {profile.year || "—"}</span>
                  </div>
                  <div className="profile-chip">
                    <ProfileIcon name="cap" />
                    <span>{profile.faculty || "ไม่พบข้อมูลคณะ"}</span>
                  </div>
                  <div className="profile-chip">
                    <ProfileIcon name="book" />
                    <span>{profile.major || "ไม่พบข้อมูลสาขา"}</span>
                  </div>
                  <div className="profile-chip">
                    <ProfileIcon name="pin" />
                    <span>มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตศรีราชา</span>
                  </div>
                  <div className="profile-chip">
                    <ProfileIcon name="calendar" />
                    <span>ปีที่เข้าศึกษา {profile.entryYear || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && <p className="profile-load-error" role="alert">{error}</p>}

          <section className="profile-stats-grid" aria-label="สรุปผลการเรียน">
            <article className="stat-card modern-stat-green">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
                  <path d="M2 7l10-4 10 4-10 4-10-4z" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinejoin="round" />
                  <path d="M6 10.5v5c4 3 8 3 12 0v-5" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">หน่วยกิตสะสม</span>
                <strong className="stat-value">{isLoading ? "..." : `${stats.completedCredits ?? "—"}/${stats.totalCredits}`}</strong>
              </div>
            </article>

            <article className="stat-card modern-stat-blue">
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
                <strong className="stat-value">{isLoading ? "..." : `${stats.remainingCredits ?? "—"} หน่วยกิต`}</strong>
              </div>
            </article>

            <article className="stat-card modern-stat-purple">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" className="stat-icon" aria-hidden="true">
                  <path d="M18 20V10" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                  <path d="M12 20V4" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                  <path d="M6 20v-6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">เกรดเฉลี่ยสะสม (GPAX)</span>
                <strong className="stat-value">{isLoading ? "..." : stats.gpax}</strong>
              </div>
            </article>

            <article className="stat-card modern-stat-yellow">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" className="stat-icon" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">สถานะการเรียน</span>
                <div className="stat-status-badge">
                  <strong className="stat-value-badge">{profile.status || "—"}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="profile-goals-card">
            <div className="profile-goals-heading">
              <div className="goals-title-group">
                <div className="panel-icon-badge green-badge">
                  <ProfileIcon name="target" />
                </div>
                <div>
                  <h2>เป้าหมายการเรียน</h2>
                  <span className="goals-subtitle">
                    สำเร็จแล้ว {goals.filter((g) => g.checked).length} จาก {goals.length} เป้าหมาย
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="profile-goals-edit-btn"
                onClick={() => setIsEditingGoals((editing) => !editing)}
              >
                {isEditingGoals ? "เสร็จสิ้น" : "แก้ไขเป้าหมาย"}
              </button>
            </div>

            <div className="goals-progress-track">
              <div
                className="goals-progress-fill"
                style={{
                  width: `${goals.length ? Math.round((goals.filter((g) => g.checked).length / goals.length) * 100) : 0}%`,
                }}
              />
            </div>

            <ul className={`goals-list ${isEditingGoals ? "is-editing" : ""}`}>
              {goals.map((goal) => (
                <li key={goal.id} className={`goal-item ${goal.checked ? "is-completed" : ""}`}>
                  <label className="goal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={goal.checked}
                      onChange={() =>
                        setGoals((current) =>
                          current.map((item) =>
                            item.id === goal.id ? { ...item, checked: !item.checked } : item,
                          ),
                        )
                      }
                    />
                    <span className="goal-custom-check">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {isEditingGoals ? (
                      <input
                        type="text"
                        className="profile-goal-text-input"
                        aria-label="แก้ไขเป้าหมาย"
                        value={goal.text}
                        onChange={(event) =>
                          setGoals((current) =>
                            current.map((item) =>
                              item.id === goal.id ? { ...item, text: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    ) : (
                      <span className="goal-text">{goal.text}</span>
                    )}
                  </label>
                  {isEditingGoals && (
                    <button
                      type="button"
                      className="profile-goal-delete-btn"
                      aria-label={`ลบเป้าหมาย ${goal.text}`}
                      onClick={() => setGoals((current) => current.filter((item) => item.id !== goal.id))}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {isEditingGoals && (
              <button
                type="button"
                className="profile-goal-add-btn"
                onClick={() =>
                  setGoals((current) => [
                    ...current,
                    { id: `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`, text: "เป้าหมายใหม่", checked: false },
                  ])
                }
              >
                + เพิ่มเป้าหมายใหม่
              </button>
            )}
          </section>
        </div>

        <footer className="profile-footer">
          <div className="footer-container">
            <button
              type="button"
              className="report-issue-btn"
              onClick={() => alert("ระบบแจ้งปัญหา: สามารถส่งเรื่องข้อผิดพลาดหรือข้อเสนอแนะถึงทีมพัฒนาระบบ PlanC")}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>แจ้งปัญหาการใช้งาน</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
