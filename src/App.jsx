import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Home from "./Home/Home";
import Login from "./Login/Login";
import Profile from "./Profile/Profile";
import StudyPlanner from "./Planner/StudyPlanner";

const sections = [
  {
    to: "/study-plan",
    title: "จัดการแผนการเรียน",
  },
  {
    to: "/grades",
    title: "ดูผลการเรียน",
  },
  {
    to: "/cooperative-plan",
    title: "จัดแผนสหกิจ",
  },
];

function Placeholder({ title, description }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">กำลังเตรียม</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <NavLink className="back" to="/">← กลับหน้าแรก</NavLink>
    </section>
  );
}

function getSemesters(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [payload.results, payload.data, payload.result, payload.semesters];
  return candidates.find(Array.isArray) || [];
}

function courseValue(course, names, fallback = "—") {
  const directValue = names
    .map((name) => course?.[name])
    .find((value) => value !== undefined && value !== null && value !== "");

  if (directValue !== undefined) return directValue;

  const expectedNames = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const matchingValue = Object.entries(course || {}).find(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      expectedNames.some((name) => normalizedKey.includes(name) || name.includes(normalizedKey))
    );
  })?.[1];

  return matchingValue ?? fallback;
}

function courseName(course) {
  const englishNames = [
    "subject_name_en", "subjectname_en", "subjectNameEn", "subjectNameEng",
    "subjectNameEnglish", "course_name_en", "coursename_en", "courseNameEn",
    "courseNameEng", "courseNameEnglish", "english_name", "name_en", "nameEng",
  ];
  const englishName = englishNames
    .map((name) => course?.[name])
    .find((value) => value !== undefined && value !== null && value !== "");

  if (englishName !== undefined) return englishName;

  const englishField = Object.entries(course || {}).find(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      value !== undefined && value !== null && value !== "" &&
      /(?:subject|course)(?:name|title).*(?:en|eng|english)$/.test(normalizedKey)
    );
  })?.[1];

  return englishField ?? courseValue(course, [
    "subjectname", "subject_name", "subject_name_th", "subjectNameTh",
    "coursename", "course_name", "course_name_th", "courseNameTh", "name",
  ]);
}

function semesterSortValue(semester) {
  const semesterText = String(courseValue(semester, ["semester", "semester_name", "term", "name"], ""));
  const yearText = String(courseValue(semester, ["year", "academic_year", "academicYear"], ""));
  const fullText = `${yearText} ${semesterText}`;
  const year = Number((fullText.match(/(?:25|20)\d{2}/) || [0])[0]) || 0;
  const term = Number((yearText.match(/\/\s*([12])\s*\/?$/) || semesterText.match(/(?:term|ภาค(?:เรียน|การศึกษา)?(?:ที่)?\s*)([12])/i) || [0, 0])[1]) || 0;
  return (year * 10) + term;
}

function academicYearOf(semester) {
  const semesterText = String(courseValue(semester, ["semester", "semester_name", "term", "name"], ""));
  const yearText = String(courseValue(semester, ["year", "academic_year", "academicYear"], ""));
  return ((`${yearText} ${semesterText}`).match(/(?:25|20)\d{2}/) || ["—"])[0];
}

function sortSemestersNewestFirst(items) {
  return items
    .map((semester, index) => ({ semester, index, sortValue: semesterSortValue(semester) }))
    .sort((left, right) => right.sortValue - left.sortValue || left.index - right.index)
    .map(({ semester }) => semester);
}

function gradeTone(grade) {
  const value = String(grade || "").trim().toUpperCase();
  if (value.startsWith("A")) return "excellent";
  if (value.startsWith("B")) return "good";
  if (value.startsWith("C")) return "fair";
  if (value.startsWith("D") || value === "F") return "attention";
  return "neutral";
}

function Grades({ session }) {
  const [semesters, setSemesters] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGrades() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/grades?idcode=${encodeURIComponent(session.idcode)}`, {
          headers: { "x-access-token": session.token },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "ไม่สามารถดึงผลการเรียนได้");
        setSemesters(sortSemestersNewestFirst(getSemesters(data)));
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "ไม่สามารถดึงผลการเรียนได้");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadGrades();
    return () => controller.abort();
  }, [session.idcode, session.token]);

  const totalCourses = semesters.reduce((total, semester) => total + (semester.grade || semester.grades || semester.courses || []).length, 0);
  const latestCourses = semesters[0]?.grade || semesters[0]?.grades || semesters[0]?.courses || [];
  const latestCredits = latestCourses.reduce((total, course) => total + (Number(courseValue(course, ["credit", "credits", "credit_hour", "creditHours"], 0)) || 0), 0);
  const latestAcademicYear = semesters[0] ? academicYearOf(semesters[0]) : "—";

  return (
    <section className="grades-page">
      <header className="grades-hero">
        <div>
          <p className="eyebrow">ACADEMIC RECORD</p>
          <h1>ผลการเรียนของคุณ</h1>
          <p className="grades-caption">เรียงภาคเรียนล่าสุดก่อน เพื่อดูผลการเรียนปัจจุบันได้ทันที</p>
        </div>
        <div className="grades-student-card"><span>รหัสนิสิต</span><strong>{session.idcode}</strong></div>
      </header>
      {!isLoading && !error && semesters.length > 0 && <div className="grades-summary">
        <article><span>ปีการศึกษาล่าสุด</span><strong>{latestAcademicYear}</strong><small>{latestCredits} หน่วยกิต</small></article>
        <article><span>ประวัติภาคเรียน</span><strong>{semesters.length}</strong><small>ภาคเรียน</small></article>
        <article><span>รายวิชาทั้งหมด</span><strong>{totalCourses}</strong><small>รายวิชา</small></article>
      </div>}
      {isLoading && <div className="status-card">กำลังดึงผลการเรียน...</div>}
      {error && <div className="status-card error-card" role="alert">{error}</div>}
      {!isLoading && !error && semesters.length === 0 && (
        <div className="status-card">ยังไม่พบข้อมูลผลการเรียน</div>
      )}
      {!isLoading && semesters.map((semester, semesterIndex) => {
        const courses = semester.grade || semester.grades || semester.courses || [];
        const semesterName = courseValue(semester, ["semester", "semester_name", "term", "name"], "");
        const year = courseValue(semester, ["year", "academic_year", "academicYear"], "");
        const academicYear = academicYearOf(semester);
        return (
          <article className={`semester-card ${semesterIndex === 0 ? "latest-semester" : ""}`} key={`${semesterName}-${year}-${semesterIndex}`}>
            <div className="semester-heading">
              <div><span className="semester-order">{semesterIndex === 0 ? "ข้อมูลล่าสุด" : "ผลการเรียนย้อนหลัง"}</span><h2>ปีการศึกษา {academicYear}</h2><small>{semesterName || "ข้อมูลผลการเรียน"}</small></div>
              <span className="course-count">{courses.length} วิชา</span>
            </div>
            <div className="grade-table-wrap">
              <table>
                <thead><tr><th>รหัสวิชา</th><th>รายวิชา</th><th>หน่วยกิต</th><th>เกรด</th></tr></thead>
                <tbody>
                  {courses.map((course, courseIndex) => {
                    const grade = courseValue(course, ["grade", "grade_result", "result"]);
                    return (
                      <tr key={`${courseValue(course, ["subjectcode", "subject_code", "coursecode", "course_code", "code"], courseIndex)}-${courseIndex}`}>
                        <td>{courseValue(course, ["subjectcode", "subject_code", "coursecode", "course_code", "code"])}</td>
                        <td>{courseName(course)}</td>
                        <td>{courseValue(course, ["credit", "credits", "credit_hour", "creditHours"])}</td>
                        <td><span className={`grade-badge ${gradeTone(grade)}`}>{grade}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </section>
  );
}

const PASSING_GRADES = new Set(["A", "B+", "B", "C+", "C", "D+", "D", "S"]);
const GRADE_POINTS = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, "D+": 1.5, D: 1, F: 0 };
const COOPERATIVE_COURSES = {
  "03603111": { name: "Programming Fundamentals I", credits: 3 },
  "03603112": { name: "Programming Fundamentals II", credits: 3 },
  "03603212": { name: "Abstract Data Types and Problem Solving", credits: 3 },
  "03603213": { name: "Algorithm Design and Analysis", credits: 3 },
  "03603214": { name: "Programming Skills Development Laboratory", credits: 1 },
  "03603241": { name: "Application Development", credits: 3 },
  "03603251": { name: "Database Systems", credits: 3 },
  "03603252": { name: "Database Systems Laboratory", credits: 1 },
  "03603341": { name: "Software Engineering", credits: 4 },
  "03603342": { name: "Combined Information Technology for Software Development Laboratory", credits: 1 },
  "03603171": { name: "Introduction to Computer Engineering and Informatics", credits: 3 },
  "03603211": { name: "Discrete Mathematics", credits: 3 },
  "03603221": { name: "Digital Systems Design", credits: 3 },
  "03603222": { name: "Logic Circuit Laboratory", credits: 1 },
  "03603223": { name: "Computer Architecture and Organization", credits: 3 },
  "03603312": { name: "Probability and Statistics for Informatics", credits: 3 },
  "03603323": { name: "Introduction to Embedded Systems", credits: 3 },
  "03603324": { name: "Embedded Systems Laboratory", credits: 1 },
  "03603325": { name: "Data Communications and Computer Networks", credits: 3 },
  "03603332": { name: "Operating Systems", credits: 3 },
};
const COOPERATIVE_GROUPS = [
  {
    id: "software",
    title: "Software Design and Development Foundations",
    requiredCredits: 19,
    totalCredits: 25,
    codes: ["03603111", "03603112", "03603212", "03603213", "03603214", "03603241", "03603251", "03603252", "03603341", "03603342"],
  },
  {
    id: "systems",
    title: "Computational Theory and Systems Foundations",
    requiredCredits: 20,
    totalCredits: 26,
    codes: ["03603171", "03603211", "03603221", "03603222", "03603223", "03603312", "03603323", "03603324", "03603325", "03603332"],
  },
];

function CooperativePlan({ session }) {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [excludedCodes, setExcludedCodes] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`planc-coop-excluded-${session?.idcode || "guest"}`) || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    async function loadGrades() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/grades?idcode=${encodeURIComponent(session.idcode)}`, {
          headers: { "x-access-token": session.token },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "ไม่สามารถดึงผลการเรียนได้");
        const semesters = getSemesters(data);
        setCourses(semesters.flatMap((semester) => semester.grade || semester.grades || semester.courses || []));
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "ไม่สามารถดึงผลการเรียนได้");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadGrades();
    return () => controller.abort();
  }, [session.idcode, session.token]);

  useEffect(() => {
    localStorage.setItem(`planc-coop-excluded-${session?.idcode || "guest"}`, JSON.stringify([...excludedCodes]));
  }, [excludedCodes, session?.idcode]);

  function toggleCourse(code) {
    setExcludedCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // Grade records arrive newest-first. Keep only the latest attempt of a repeated course.
  const latestCourseByCode = new Map();
  courses.forEach((course) => {
    const code = courseValue(course, ["subjectcode", "subject_code", "coursecode", "course_code", "code"], "");
    if (code && !latestCourseByCode.has(code)) latestCourseByCode.set(code, course);
  });
  const groupResults = COOPERATIVE_GROUPS.map((group) => {
    const entries = group.codes.map((code) => {
      const course = latestCourseByCode.get(code);
      const grade = course ? String(courseValue(course, ["grade", "grade_result", "result"], "")).toUpperCase() : "";
      const credits = Number(courseValue(course, ["credit", "credits", "credit_hour", "creditHours"], COOPERATIVE_COURSES[code]?.credits || 0)) || COOPERATIVE_COURSES[code]?.credits || 0;
      return { code, course, grade, credits, excluded: excludedCodes.has(code) };
    });
    const selectedRecords = entries.filter((entry) => !entry.excluded && entry.course);
    const passedCredits = selectedRecords.reduce((total, { grade, credits }) => {
      return total + (PASSING_GRADES.has(grade) ? credits : 0);
    }, 0);
    const gradedRecords = selectedRecords.filter(({ grade }) => Object.hasOwn(GRADE_POINTS, grade));
    const gradedCredits = gradedRecords.reduce((total, { credits }) => total + credits, 0);
    const gpa = gradedCredits ? gradedRecords.reduce((total, { grade, credits }) => {
      return total + (GRADE_POINTS[grade] * credits);
    }, 0) / gradedCredits : 0;
    return { ...group, entries, passedCredits, remainingCredits: Math.max(0, group.requiredCredits - passedCredits), gpa, creditPassed: passedCredits >= group.requiredCredits, gpaPassed: gradedCredits > 0 && gpa >= 2 };
  });
  const isEligible = groupResults.every((group) => group.creditPassed && group.gpaPassed);

  return (
    <section className="cooperative-page">
      <header className="cooperative-hero">
        <div>
          <p className="eyebrow">CO-OPERATIVE EDUCATION</p>
          <h1>ตรวจสิทธิ์สหกิจศึกษา</h1>
          <p>ตรวจเกณฑ์ก่อนออกฝึกสหกิจในปี 4 ภาคปลาย สำหรับนิสิตรหัส 66</p>
        </div>
        {!isLoading && !error && <div className={`cooperative-result ${isEligible ? "eligible" : "not-eligible"}`}>
          <span>สิทธิ์ออกฝึกสหกิจ</span>
          <strong>{isEligible ? "ผ่านเกณฑ์" : "ยังไม่ผ่านเกณฑ์"}</strong>
        </div>}
      </header>

      {isLoading && <div className="status-card">กำลังตรวจสอบผลการเรียน...</div>}
      {error && <div className="status-card error-card" role="alert">{error}</div>}
      {!isLoading && !error && <>
        <div className="cooperative-information" role="note">
          <strong>วิชาเตรียมสหกิจศึกษา (03600390)</strong>
          <span>กำหนดไว้ในปี 3 ภาคปลาย และลงเรียนได้โดยยังไม่ต้องผ่านเกณฑ์ด้านล่าง เกณฑ์นี้ใช้ตรวจสิทธิ์ก่อนออกฝึกในปี 4 ภาคปลาย</span>
          <small>เลือก “ไม่นับ” ในรายวิชาที่ไม่ต้องการนำมาใช้จำลองผลได้ ระบบจะคำนวณหน่วยกิตและเกรดเฉลี่ยของกลุ่มใหม่ทันที</small>
        </div>

        <div className="cooperative-grid group-grid">
          {groupResults.map((group) => {
            const groupPassed = group.creditPassed && group.gpaPassed;
            return <article className={`cooperative-card group-card ${groupPassed ? "group-passed" : "group-missing"}`} key={group.id}>
              <div className="section-heading">
                <div><p className="eyebrow">REQUIRED COURSE GROUP</p><h2>{group.title}</h2></div>
                <span className={`requirement-status ${groupPassed ? "passed" : "missing"}`}>{groupPassed ? "ผ่านเกณฑ์" : "ยังไม่ผ่าน"}</span>
              </div>
              <div className="group-metrics">
                <div><span>หน่วยกิตที่ใช้คำนวณ</span><strong>{group.passedCredits}<small> / {group.requiredCredits}</small></strong><em>{group.remainingCredits ? `ยังต้องผ่านอีก ${group.remainingCredits} หน่วยกิต` : "ครบตามเกณฑ์หน่วยกิตแล้ว"}</em></div>
                <div><span>เกรดเฉลี่ยกลุ่ม</span><strong>{group.gpa.toFixed(2)}</strong><em>เกณฑ์ขั้นต่ำ 2.00</em></div>
              </div>
              <div className="group-progress" aria-label={`หน่วยกิตที่ผ่าน ${group.passedCredits} จาก ${group.requiredCredits}`}><span style={{ width: `${Math.min(100, (group.passedCredits / group.requiredCredits) * 100)}%` }} /></div>
              <div className="group-table-wrap">
                <table className="group-course-table">
                  <thead><tr><th>รหัสวิชา</th><th>ชื่อรายวิชา</th><th>หน่วยกิต</th><th>ผลการเรียน</th><th>การคำนวณ</th></tr></thead>
                  <tbody>{group.entries.map((entry) => {
                    const passed = PASSING_GRADES.has(entry.grade);
                    const gradeLabel = entry.course ? (entry.grade || "—") : "ยังไม่เรียน";
                    return <tr className={entry.excluded ? "excluded-course" : ""} key={entry.code}>
                      <td>{entry.code}</td><td>{entry.course ? courseName(entry.course) : COOPERATIVE_COURSES[entry.code].name}</td><td>{entry.credits}</td>
                      <td><span className={`course-grade ${passed ? "passed" : entry.course ? "not-passed" : "not-taken"}`}>{gradeLabel}</span></td>
                      <td><button type="button" className={`course-toggle ${entry.excluded ? "excluded" : "included"}`} aria-pressed={!entry.excluded} onClick={() => toggleCourse(entry.code)}>{entry.excluded ? "ไม่นับ" : "ใช้คำนวณ"}</button></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </article>;
          })}
        </div>
      </>}
    </section>
  );
}

function Protected({ session, children }) {
  return session ? children : <Navigate to="/" replace />;
}

function ShellNavIcon({ type }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    plan: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4m8-4v4M3 9h18m-13 5 2 2 4-4" /></>,
    grades: <><path d="M4 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Z" /><path d="M9 8h5m-5 4h5m-5 4h3m6-9h2v12h-2" /></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  };
  return <svg className="planner-nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

function StandardPageShell({ session, onLogout, children }) {
  const [showSidebar, setShowSidebar] = useState(() => typeof window !== "undefined" && window.innerWidth > 820);
  const studentCode = session?.stdCode || session?.username || session?.idcode || "";
  const studentName = session?.name || session?.student?.stdNameTh || session?.student?.name || "นิสิต";
  return (
    <div className={`planner-app standard-page-shell ${showSidebar ? "sidebar-open" : "sidebar-closed"}`}>
      <button className="planner-sidebar-backdrop" type="button" aria-label="ปิดเมนู" onClick={() => setShowSidebar(false)} />
      <aside className="planner-sidebar" aria-label="เมนูหลัก">
        <NavLink className="planner-sidebar-brand" to="/dashboard"><span>PlanC</span><svg viewBox="0 0 40 30" aria-hidden="true"><path d="M2 8 20 2l18 6-18 7L2 8Z" /><path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" /><path d="M36 9v11" /></svg></NavLink>
        <nav className="planner-sidebar-nav">
          <NavLink to="/dashboard"><ShellNavIcon type="home" /><span>หน้าหลัก</span></NavLink>
          <NavLink to="/study-plan"><ShellNavIcon type="plan" /><span>วางแผนการเรียน</span></NavLink>
          <NavLink to="/grades"><ShellNavIcon type="grades" /><span>เช็ควิชาและหน่วยกิต</span></NavLink>
          <NavLink to="/cooperative-plan"><ShellNavIcon type="calculator" /><span>ตรวจสิทธิ์สหกิจ</span></NavLink>
          <NavLink to="/profile"><ShellNavIcon type="profile" /><span>โปรไฟล์</span></NavLink>
        </nav>
        <button className="planner-sidebar-logout" type="button" onClick={onLogout}>ออกจากระบบ</button>
      </aside>
      <div className="planner-app-content">
        <header className="planner-topbar">
          <button className="planner-menu-button" type="button" aria-label={showSidebar ? "ปิดเมนู" : "เปิดเมนู"} onClick={() => setShowSidebar((current) => !current)}><span /><span /><span /></button>
          <div className="planner-user"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg><span>{studentName}{studentCode ? ` ${studentCode}` : ""}</span></div>
        </header>
        <div className="standard-page-content">{children}</div>
        <footer className="planner-footer"><button type="button" onClick={() => alert("ระบบแจ้งปัญหา: กรุณาส่งรายละเอียดปัญหาให้ทีมพัฒนา PlanC")}>แจ้งปัญหาการใช้งาน</button></footer>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("ku-session"));
    } catch {
      return null;
    }
  });

  function logout() {
    sessionStorage.removeItem("ku-session");
    setSession(null);
  }

  const pathname = (location.pathname || "").toLowerCase().replace(/\/+$/, "");
  const isDashboard = pathname === "/dashboard" || pathname === "";
  const isProfile = pathname === "/profile";
  const isPlanner = pathname === "/study-plan";
  const isFullWidthPage = isDashboard || isProfile || isPlanner;

  return (
    <div className={`app-shell${session ? " dashboard-shell" : " login-shell"}`}>
      <main className={session ? "dashboard-main" : ""}>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Login onLogin={setSession} />} />
          <Route path="/dashboard" element={<Protected session={session}><Home session={session} onLogout={logout} /></Protected>} />
          <Route path="/profile" element={<Protected session={session}><Profile session={session} onLogout={logout} /></Protected>} />
          <Route path="/study-plan" element={<Protected session={session}><StudyPlanner session={session} onLogout={logout} /></Protected>} />
          <Route path="/grades" element={<Protected session={session}><StandardPageShell session={session} onLogout={logout}><Grades session={session} /></StandardPageShell></Protected>} />
          <Route path="/cooperative-plan" element={<Protected session={session}><StandardPageShell session={session} onLogout={logout}><CooperativePlan session={session} /></StandardPageShell></Protected>} />
          <Route path="*" element={<Placeholder title="ไม่พบหน้านี้" description="ลิงก์ที่เปิดไม่มีอยู่ในระบบ" />} />
        </Routes>
      </main>
    </div>
  );
}
