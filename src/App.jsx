import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";

const sections = [
  {
    to: "/study-plan",
    icon: "▤",
    title: "จัดการแผนการเรียน",
    description: "วางรายวิชาและติดตามแผนการเรียนของคุณ",
  },
  {
    to: "/grades",
    icon: "◆",
    title: "ดูผลการเรียน",
    description: "ดูผลการเรียนและสรุปผลในแต่ละภาคการศึกษา",
  },
  {
    to: "/cooperative-plan",
    icon: "↗",
    title: "จัดแผนสหกิจ",
    description: "เตรียมแผนและขั้นตอนสำหรับสหกิจศึกษา",
  },
];

function Home() {
  return (
    <section className="home">
      <p className="eyebrow">KU STUDENT PLANNER</p>
      <h1>วางเส้นทางการเรียน<br />ในแบบของคุณ</h1>
      <p className="intro">เลือกสิ่งที่ต้องการจัดการเพื่อเริ่มต้นใช้งาน</p>
      <div className="cards">
        {sections.map((section) => (
          <NavLink className="card" to={section.to} key={section.to}>
            <span className="card-icon" aria-hidden="true">{section.icon}</span>
            <span className="card-content">
              <span className="card-title">{section.title}</span>
              <span className="card-description">{section.description}</span>
            </span>
            <span className="arrow" aria-hidden="true">→</span>
          </NavLink>
        ))}
      </div>
    </section>
  );
}

function Login({ onLogin }) {
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

      const session = {
        username,
        idcode:
          data.idcode ||
          data.user?.idcode ||
          data.user?.student?.idcode ||
          username.replace(/^[bB](?=\d)/, ""),
        token: data.accesstoken,
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
    <section className="login-layout">
      <div className="login-copy">
        <p className="eyebrow">KU STUDENT PLANNER</p>
        <h1>เทสๆ<br />ครับเจต</h1>
        <p>เข้าสู่ระบบด้วยบัญชีนนทรี เพื่อจัดการข้อมูลการเรียนของคุณ</p>
      </div>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-mark">KU</div>
        <h2>เข้าสู่ระบบ</h2>
        <p className="login-subtitle">ใช้รหัสนิสิตหรือ Username ของ KU</p>
        <label htmlFor="username">รหัสนิสิต / Username</label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
        <label htmlFor="password">รหัสผ่าน</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </section>
  );
}

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

  return (
    <div className="app-shell">
      {session && (
        <header>
          <NavLink className="brand" to="/dashboard">
            <span className="brand-mark">KU</span>
            <span>Student Planner</span>
          </NavLink>
          <nav aria-label="เมนูหลัก">
            {sections.map((section) => (
              <NavLink key={section.to} to={section.to}>{section.title}</NavLink>
            ))}
            <button className="logout" onClick={logout}>ออกจากระบบ</button>
          </nav>
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Login onLogin={setSession} />} />
          <Route path="/dashboard" element={<Protected session={session}><Home /></Protected>} />
          <Route path="/study-plan" element={<Protected session={session}><Placeholder title="จัดการแผนการเรียน" description="หน้านี้พร้อมสำหรับเพิ่มรายวิชาและสร้างแผนการเรียน" /></Protected>} />
          <Route path="/grades" element={<Protected session={session}><Grades session={session} /></Protected>} />
          <Route path="/cooperative-plan" element={<Protected session={session}><Placeholder title="จัดแผนสหกิจ" description="หน้านี้พร้อมสำหรับวางแผนสหกิจศึกษา" /></Protected>} />
          <Route path="*" element={<Placeholder title="ไม่พบหน้านี้" description="ลิงก์ที่เปิดไม่มีอยู่ในระบบ" />} />
        </Routes>
      </main>
    </div>
  );
}
