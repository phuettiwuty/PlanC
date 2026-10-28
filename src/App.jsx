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
        setSemesters(getSemesters(data));
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

  return (
    <section className="grades-page">
      <p className="eyebrow">ผลการเรียน</p>
      <h1>ผลการเรียนของคุณ</h1>
      <p className="grades-caption">รหัสนิสิต {session.idcode}</p>
      {isLoading && <div className="status-card">กำลังดึงผลการเรียน...</div>}
      {error && <div className="status-card error-card" role="alert">{error}</div>}
      {!isLoading && !error && semesters.length === 0 && (
        <div className="status-card">ยังไม่พบข้อมูลผลการเรียน</div>
      )}
      {!isLoading && semesters.map((semester, semesterIndex) => {
        const courses = semester.grade || semester.grades || semester.courses || [];
        const semesterName = courseValue(semester, ["semester", "semester_name", "term", "name"], `ภาคการศึกษาที่ ${semesterIndex + 1}`);
        const year = courseValue(semester, ["year", "academic_year", "academicYear"], "");
        return (
          <article className="semester-card" key={`${semesterName}-${year}-${semesterIndex}`}>
            <div className="semester-heading">
              <h2>{semesterName}{year && ` / ${year}`}</h2>
              <span>{courses.length} วิชา</span>
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
                        <td><span className="grade-badge">{grade}</span></td>
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

function Protected({ session, children }) {
  return session ? children : <Navigate to="/" replace />;
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
  const isFullWidthPage = isDashboard || isProfile;

  return (
    <div className={`app-shell${session ? (isFullWidthPage ? " dashboard-shell" : "") : " login-shell"}`}>
      {session && !isDashboard && location.pathname !== "/profile" && (
        <header className="planc-sub-header">
          <NavLink className="brand" to="/dashboard">
            <span className="brand-name">PlanC</span>
            <svg viewBox="0 0 40 30" className="brand-cap" aria-hidden="true">
              <path d="M2 8 20 2l18 6-18 7L2 8Z" />
              <path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" />
              <path d="M36 9v11" />
            </svg>
          </NavLink>
          <nav aria-label="เมนูหลัก">
            <NavLink to="/dashboard">หน้าหลัก</NavLink>
            {sections.map((section) => (
              <NavLink key={section.to} to={section.to}>{section.title}</NavLink>
            ))}
            <button className="logout" onClick={logout}>ออกจากระบบ</button>
          </nav>
        </header>
      )}
      <main className={isFullWidthPage ? "dashboard-main" : ""}>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Login onLogin={setSession} />} />
          <Route path="/dashboard" element={<Protected session={session}><Home session={session} onLogout={logout} /></Protected>} />
          <Route path="/profile" element={<Protected session={session}><Profile session={session} onLogout={logout} /></Protected>} />
          <Route path="/study-plan" element={<Protected session={session}><StudyPlanner session={session} /></Protected>} />
          <Route path="/grades" element={<Protected session={session}><Grades session={session} /></Protected>} />
          <Route path="/cooperative-plan" element={<Protected session={session}><Placeholder title="จัดแผนสหกิจ" description="หน้านี้พร้อมสำหรับวางแผนสหกิจศึกษา" /></Protected>} />
          <Route path="*" element={<Placeholder title="ไม่พบหน้านี้" description="ลิงก์ที่เปิดไม่มีอยู่ในระบบ" />} />
        </Routes>
      </main>
    </div>
  );
}
