import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { loadStudyPlans, makeStudyPlan, saveStudyPlans } from "./planRepository";
import { deleteRemoteStudyPlan, fetchRemoteStudyPlanHistory, fetchRemoteStudyPlans, syncRemoteStudyPlans } from "./planRemote";

// Starter catalogue. This can later be replaced by the official curriculum file.
const catalogue = [
  { code: "01417167", name: "คณิตศาสตร์วิศวกรรม I", credits: 3, term: 1, pre: [] },
  { code: "01420111", name: "ฟิสิกส์ทั่วไป I", credits: 3, term: 1, pre: [] },
  { code: "03603111", name: "หลักการโปรแกรมเบื้องต้น I", credits: 3, term: 1, pre: [] },
  { code: "03604111", name: "การเขียนแบบทางวิศวกรรม", credits: 3, term: 1, pre: [] },
  { code: "01999111", name: "ศาสตร์แห่งแผ่นดิน", credits: 2, term: 1, pre: [] },
  { code: "01420113", name: "ปฏิบัติการฟิสิกส์ I", credits: 1, term: 1, pre: [] },
  { code: "01355xx1", name: "ภาษาอังกฤษ", credits: 3, term: 1, pre: [] },
  { code: "03600012", name: "เทคโนโลยีสีเขียว", credits: 3, term: 1, pre: [] },
  { code: "01417168", name: "คณิตศาสตร์วิศวกรรม II", credits: 3, term: 2, pre: ["01417167"] },
  { code: "01420112", name: "ฟิสิกส์ทั่วไป II", credits: 3, term: 2, pre: ["01420111"] },
  { code: "03603112", name: "หลักการโปรแกรมเบื้องต้น II", credits: 3, term: 2, pre: ["03603111"] },
  { code: "03601204", name: "การวิเคราะห์วงจรไฟฟ้า", credits: 3, term: 2, pre: [] },
  { code: "03603171", name: "วิศวกรรมคอมพิวเตอร์และสารสนเทศศาสตร์เบื้องต้น", credits: 3, term: 2, pre: [] },
  { code: "01420114", name: "ปฏิบัติการฟิสิกส์ II", credits: 1, term: 2, pre: ["01420113"] },
  { code: "03600014", name: "การแก้ปัญหาเชิงสร้างสรรค์และทักษะการคิดเชิงวิพากษ์", credits: 3, term: 2, pre: [] },
  { code: "03600013", name: "เครื่องมือและทักษะคอมพิวเตอร์ที่จำเป็น", credits: 1, term: 2, pre: [] },
  { code: "01417267", name: "คณิตศาสตร์วิศวกรรม III", credits: 3, term: 3, pre: ["01417168"] },
  { code: "03603211", name: "วิยุตคณิต", credits: 3, term: 3, pre: [] },
  { code: "03603212", name: "แบบชนิดข้อมูลนามธรรมและการแก้ปัญหา", credits: 3, term: 3, pre: ["03603111"] },
  { code: "03603221", name: "การออกแบบระบบดิจิทัล", credits: 3, term: 3, pre: ["03603171"] },
  { code: "03601203", name: "อิเล็กทรอนิกส์สำหรับวิศวกรคอมพิวเตอร์", credits: 3, term: 3, pre: ["03601204"] },
  { code: "03601205", name: "ปฏิบัติการวงจรไฟฟ้าสำหรับวิศวกรคอมพิวเตอร์", credits: 1, term: 3, pre: ["03601204"] },
  { code: "03603222", name: "ปฏิบัติการวงจรตรรก", credits: 1, term: 3, pre: [] },
  { code: "01355xx2", name: "ภาษาอังกฤษ", credits: 3, term: 3, pre: [] },
  { code: "03603213", name: "การออกแบบและวิเคราะห์ขั้นตอนวิธี", credits: 3, term: 4, pre: ["03603211", "03603212"] },
  { code: "03603223", name: "สถาปัตยกรรมและการจัดระบบคอมพิวเตอร์", credits: 3, term: 4, pre: ["03603221"] },
  { code: "03603325", name: "การสื่อสารข้อมูลและเครือข่ายคอมพิวเตอร์", credits: 3, term: 4, pre: [] },
  { code: "03603251", name: "ระบบฐานข้อมูล", credits: 3, term: 4, pre: [] },
  { code: "03601303", name: "ปฏิบัติการอิเล็กทรอนิกส์สำหรับวิศวกรคอมพิวเตอร์", credits: 1, term: 4, pre: ["03601203", "03601204"] },
  { code: "03603214", name: "ปฏิบัติการพัฒนาทักษะการโปรแกรม", credits: 1, term: 4, pre: ["03603112"] },
  { code: "03603241", name: "การพัฒนาโปรแกรมประยุกต์", credits: 3, term: 4, pre: [] },
  { code: "03603252", name: "ปฏิบัติการระบบฐานข้อมูล", credits: 1, term: 4, pre: [] },
  { code: "03603312", name: "ความน่าจะเป็นและสถิติสำหรับสารสนเทศศาสตร์", credits: 3, term: 5, pre: ["01417168"] },
  { code: "03603323", name: "ระบบฝังตัวเบื้องต้น", credits: 3, term: 5, pre: ["03603223"] },
  { code: "03603324", name: "ปฏิบัติการระบบฝังตัว", credits: 1, term: 5, pre: ["03603223"] },
  { code: "03603342", name: "ปฏิบัติการผสานเทคโนโลยีสารสนเทศเพื่อการพัฒนาซอฟต์แวร์", credits: 1, term: 5, pre: [] },
  { code: "01175xxx", name: "กิจกรรมพลศึกษา", credits: 1, term: 5, pre: [] },
  { code: "01355xx3", name: "ภาษาอังกฤษ", credits: 3, term: 5, pre: [] },
  { code: "0360xxxx", name: "วิชาเฉพาะเลือกของภาค", credits: 3, term: 5, pre: [] },
  { code: "03603332", name: "ระบบปฏิบัติการ", credits: 3, term: 5, pre: ["03603223"] },
  { code: "03603341", name: "วิศวกรรมซอฟต์แวร์", credits: 4, term: 6, pre: ["03603112"] },
  { code: "03600390", name: "การเตรียมความพร้อมสหกิจศึกษา", credits: 3, term: 6, pre: [] },
  { code: "GE-WELL", name: "วิชาศึกษาทั่วไป กลุ่มสาระอยู่ดีมีสุข", credits: 2, term: 6, pre: [] },
  { code: "ELEC-02", name: "วิชาเฉพาะเลือกของภาค", credits: 3, term: 6, pre: [] },
  { code: "FREE-01", name: "วิชาเลือกเสรี", credits: 3, term: 6, pre: [] },
  { code: "01999021", name: "วิชาภาษาไทย", credits: 3, term: 6, pre: [] },
  { code: "03603352", name: "กฎหมายและจริยธรรมทางเทคโนโลยีสารสนเทศ", credits: 3, term: 7, pre: [] },
  { code: "03603497", name: "สัมมนา", credits: 1, term: 7, pre: [] },
  { code: "GE-ENT2", name: "วิชาศึกษาทั่วไป กลุ่มสาระศาสตร์แห่งผู้ประกอบการ", credits: 3, term: 7, pre: [] },
  { code: "GE-CIT", name: "วิชาศึกษาทั่วไป กลุ่มสาระพลเมืองไทยและพลเมืองโลก", credits: 3, term: 7, pre: [] },
  { code: "ELEC-03", name: "วิชาเฉพาะเลือก", credits: 3, term: 7, pre: [] },
  { code: "ELEC-04", name: "วิชาเฉพาะเลือก", credits: 3, term: 7, pre: [] },
  { code: "FREE-02", name: "วิชาเลือกเสรี", credits: 3, term: 7, pre: [] },
  { code: "03600490", name: "สหกิจศึกษา", credits: 6, term: 8, pre: ["03600390"] },
];

const englishCourseNames = {
  "01417167": "Engineering Mathematics I",
  "01420111": "General Physics I",
  "03603111": "Programming Fundamentals I",
  "03604111": "Engineering Drawing",
  "01999111": "Knowledge of the Land",
  "01420113": "Laboratory in Physics I",
  "01355xx1": "English",
  "03600012": "Green Technology",
  "01417168": "Engineering Mathematics II",
  "01420112": "General Physics II",
  "03603112": "Programming Fundamentals II",
  "03601204": "Electric Circuit Analysis for Computer Engineers",
  "03603171": "Introduction to Computer Engineering and Informatics",
  "01420114": "Laboratory in Physics II",
  "03600014": "Creative Problem Solving and Critical Thinking Skills",
  "03600013": "Essential Computer Tools and Skills",
  "01417267": "Engineering Mathematics III",
  "03603211": "Discrete Mathematics",
  "03603212": "Abstract Data Types and Problem Solving",
  "03603221": "Digital Systems Design",
  "03601203": "Electronics for Computer Engineers",
  "03601205": "Electric Circuit Laboratory for Computer Engineers",
  "03603222": "Logic Circuit Laboratory",
  "01355xx2": "English",
  "03603213": "Algorithm Design and Analysis",
  "03603223": "Computer Architecture and Organization",
  "03603325": "Data Communications and Computer Networks",
  "03603251": "Database Systems",
  "03601303": "Electronics Laboratory for Computer Engineers",
  "03603214": "Programming Skills Development Laboratory",
  "03603241": "Application Development",
  "03603252": "Database Systems Laboratory",
  "03603312": "Probability and Statistics for Informatics",
  "03603323": "Introduction to Embedded Systems",
  "03603324": "Embedded Systems Laboratory",
  "03603342": "Combined Information Technology for Software Development Laboratory",
  "01175xxx": "Physical Education Activities",
  "01355xx3": "English",
  "0360xxxx": "Departmental Technical Elective",
  "03603332": "Operating Systems",
  "03603341": "Software Engineering",
  "03600390": "Co-operative Education Preparation",
  "GE-WELL": "General Education: Health and Well-being",
  "ELEC-02": "Departmental Technical Elective",
  "FREE-01": "Free Elective",
  "01999021": "Thai Language for Communication",
  "03603352": "Laws and Ethics in Information Technology",
  "03603497": "Seminar",
  "GE-ENT2": "General Education: Entrepreneurship",
  "GE-CIT": "General Education: Thai and Global Citizenship",
  "ELEC-03": "Departmental Technical Elective",
  "ELEC-04": "Departmental Technical Elective",
  "FREE-02": "Free Elective",
  "03600490": "Co-operative Education",
};

function courseTitle(course) {
  return shouldUseThaiDisplay(course) ? course.name : (englishCourseNames[course.code] || course.name);
}

// Subject code 03603 is the Computer Engineering and Informatics major group.
// General education, science foundations, languages, activities and co-op stay
// in Thai so students can distinguish them at a glance.
function isMajorCourse(course) {
  return String(course?.code || "").startsWith("03603");
}

function shouldUseThaiDisplay(course) {
  return Number(course?.term) >= 5 && !isMajorCourse(course);
}

const terms = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  label: `ปี ${Math.floor(index / 2) + 1} · เทอม ${(index % 2) + 1}`,
}));

const PASSING_GRADES = new Set(["A", "B+", "B", "C+", "C", "D+", "D", "S"]);
const MAX_TERM_CREDITS = 22;
const TOTAL_CREDITS = 140;
// Bump this when the official starter curriculum changes, so an old partial plan
// never hides newly added required courses.
const storageKey = "planc-study-plan-v2";

function courseCode(course) {
  return String(course?.subject_code || course?.subjectCode || course?.course_code || course?.code || "").trim();
}

function extractPassedCourses(payload) {
  const semesters = Array.isArray(payload) ? payload : payload?.results || payload?.data || [];
  return new Set(
    semesters.flatMap((semester) => semester.grade || semester.grades || semester.courses || [])
      .filter((course) => PASSING_GRADES.has(String(course?.grade || course?.result || "").toUpperCase()))
      .map(courseCode)
      .filter(Boolean),
  );
}

function defaultPlan() {
  return catalogue.map((course) => ({ code: course.code, term: course.term }));
}

function moveWithPrerequisiteFlow(currentPlan, code, term, passedCodes) {
  const nextPlan = currentPlan.map((entry) => ({
    ...entry,
    term: entry.code === code ? term : entry.term,
  }));
  if (!nextPlan.some((entry) => entry.code === code)) nextPlan.push({ code, term });
  const shiftedCodes = new Set();
  const unresolvedCodes = new Set();

  // Follow every dependency edge from the moved subject, including indirect children.
  // Example: Abstract Data Types → Algorithm → a later dependent subject.
  const entryByCode = new Map(nextPlan.map((entry) => [entry.code, entry]));
  const pendingCodes = [code];
  const visitedCodes = new Set();

  while (pendingCodes.length) {
    const prerequisiteCode = pendingCodes.shift();
    if (visitedCodes.has(prerequisiteCode)) continue;
    visitedCodes.add(prerequisiteCode);

    const dependentCourses = catalogue.filter((course) => course.pre.includes(prerequisiteCode));
    dependentCourses.forEach((course) => {
      const entry = entryByCode.get(course.code);
      if (!entry || passedCodes.has(course.code)) return;

      const prerequisiteTerms = course.pre
        .filter((requiredCode) => !passedCodes.has(requiredCode))
        .map((requiredCode) => entryByCode.get(requiredCode)?.term)
        .filter(Number.isInteger);
      if (!prerequisiteTerms.length) return;

      const nextAvailableTerm = Math.max(...prerequisiteTerms) + 1;
      if (nextAvailableTerm > terms.length) {
        unresolvedCodes.add(course.code);
        pendingCodes.push(course.code);
        return;
      }

      if (entry.term <= nextAvailableTerm - 1) {
        entry.term = nextAvailableTerm;
        shiftedCodes.add(course.code);
        unresolvedCodes.delete(course.code);
      }
      pendingCodes.push(course.code);
    });
  }

  return { plan: nextPlan, shiftedCodes: [...shiftedCodes], unresolvedCodes: [...unresolvedCodes] };
}

function autoArrangePlan(currentPlan, passedCodes) {
  const courseByCode = new Map(catalogue.map((course) => [course.code, course]));
  const entryByCode = new Map(currentPlan.map((entry) => [entry.code, entry]));
  const termCredits = Array.from({ length: 9 }, () => 0);
  const scheduledTerms = new Map();
  const deferredCodes = [];

  // Completed courses are historical records: never move them.
  currentPlan.forEach((entry) => {
    const course = courseByCode.get(entry.code);
    if (!course || !passedCodes.has(entry.code)) return;
    scheduledTerms.set(entry.code, entry.term);
    termCredits[entry.term] += course.credits;
  });

  const pending = currentPlan
    .filter((entry) => courseByCode.has(entry.code) && !passedCodes.has(entry.code))
    .sort((left, right) => (left.term - right.term) || left.code.localeCompare(right.code));

  // Work through prerequisites first. An unavailable prerequisite means the
  // dependent course stays out of the generated plan instead of being placed wrongly.
  while (pending.length) {
    let progressed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const entry = pending[index];
      const course = courseByCode.get(entry.code);
      const unavailablePrerequisite = course.pre.some((code) => !passedCodes.has(code) && !entryByCode.has(code));
      if (unavailablePrerequisite) {
        deferredCodes.push(entry.code);
        pending.splice(index, 1);
        progressed = true;
        continue;
      }
      const waitingForPrerequisite = course.pre.some((code) => !passedCodes.has(code) && !scheduledTerms.has(code));
      if (waitingForPrerequisite) continue;

      const prerequisiteTerm = course.pre.reduce((latest, code) => (
        passedCodes.has(code) ? latest : Math.max(latest, scheduledTerms.get(code) || 0)
      ), 0);
      const earliestTerm = Math.max(entry.term, prerequisiteTerm + (prerequisiteTerm ? 1 : 0));
      let assignedTerm = 0;
      for (let term = earliestTerm; term <= 8; term += 1) {
        if (termCredits[term] + course.credits <= MAX_TERM_CREDITS) {
          assignedTerm = term;
          break;
        }
      }
      if (!assignedTerm) deferredCodes.push(entry.code);
      else {
        scheduledTerms.set(entry.code, assignedTerm);
        termCredits[assignedTerm] += course.credits;
      }
      pending.splice(index, 1);
      progressed = true;
    }
    if (!progressed) {
      deferredCodes.push(...pending.map((entry) => entry.code));
      break;
    }
  }

  const plan = currentPlan
    .filter((entry) => !deferredCodes.includes(entry.code))
    .map((entry) => ({ ...entry, term: scheduledTerms.get(entry.code) || entry.term }));
  const movedCodes = plan.filter((entry) => entryByCode.get(entry.code)?.term !== entry.term).map((entry) => entry.code);
  return { plan, movedCodes, deferredCodes };
}

const curriculumOrder = [
  ["01417167", "01420111", "01420113", "01999111", "03603111", "03604111"],
  ["01417168", "01420112", "01420114", "03601204", "03603112", "03603171"],
  ["01417267", "03601203", "03601205", "03603211", "03603212", "03603221", "03603222"],
  ["03601303", "03603213", "03603214", "03603223", "03603325", "03603241", "03603251", "03603252"],
  ["03603312", "03603323", "03603324", "03603332", "03603342"],
  ["03600390", "03603341"],
  ["03603352", "03603497"],
  ["03600490"],
];

function PlannerNavIcon({ type }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    plan: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4m8-4v4M3 9h18m-13 5 2 2 4-4" /></>,
    grades: <><path d="M4 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Z" /><path d="M9 8h5m-5 4h5m-5 4h3m6-9h2v12h-2" /></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  };
  return <svg className="planner-nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

export default function StudyPlanner({ session, onLogout }) {
  const studentStorageId = session?.idcode || session?.stdCode || session?.username || "guest";
  const defaultCoursesForSession = () => session?.demoScenario === "year2-dropped-abstract"
    ? defaultPlan().filter((course) => course.code !== "03603212")
    : defaultPlan();
  const [planState, setPlanState] = useState(() => loadStudyPlans(studentStorageId, defaultCoursesForSession()));
  const { plans, activePlanId } = planState;
  const activePlan = plans.find((item) => item.id === activePlanId) || plans[0];
  const plan = activePlan?.courses || [];
  const [selectedCode, setSelectedCode] = useState(catalogue[0].code);
  const [passedCodes, setPassedCodes] = useState(new Set());
  const [loadError, setLoadError] = useState("");
  const [draggedCode, setDraggedCode] = useState("");
  const [dropTerm, setDropTerm] = useState(null);
  const [links, setLinks] = useState([]);
  const [planNotice, setPlanNotice] = useState("");
  const [undoPlan, setUndoPlan] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");
  const [activeYear, setActiveYear] = useState(0);
  const [quickCourseCode, setQuickCourseCode] = useState("");
  const [quickTargetTerm, setQuickTargetTerm] = useState("");
  const [plannerPopup, setPlannerPopup] = useState(null);
  const [plannerConfirmation, setPlannerConfirmation] = useState(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [planHistory, setPlanHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("idle");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState("กำลังเชื่อมพื้นที่เก็บแผน");
  const [savedPlanSignature, setSavedPlanSignature] = useState("");
  const treeRef = useRef(null);
  const scrollRef = useRef(null);
  const yearRefs = useRef({});
  const nodeRefs = useRef({});

  // Load saved plans from the cloud. Editing stays local until the student
  // explicitly presses the save button.
  useEffect(() => {
    let cancelled = false;
    if (session?.isDemo) {
      setRemoteReady(false);
      setRemoteStatus("บัญชีตัวอย่าง · กดบันทึกเพื่อเก็บในเครื่อง");
      return () => { cancelled = true; };
    }
    setRemoteReady(false);
    setRemoteStatus("กำลังโหลดแผนที่บันทึกไว้");
    fetchRemoteStudyPlans(session)
      .then(({ plans: remotePlans }) => {
        if (cancelled) return;
        if (Array.isArray(remotePlans) && remotePlans.length) {
          const loadedState = { plans: remotePlans, activePlanId: remotePlans[0].id };
          setPlanState(loadedState);
          setSavedPlanSignature(JSON.stringify(loadedState.plans));
          setRemoteStatus("โหลดแผนที่บันทึกไว้แล้ว");
        } else {
          setRemoteStatus("ยังไม่มีแผนที่บันทึกบนคลาวด์");
        }
        setRemoteReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        // The current browser copy remains usable when offline or while the
        // server is starting. It will be uploaded after the next successful load.
        setRemoteStatus("ใช้แผนที่บันทึกในเครื่องชั่วคราว");
      });
    return () => { cancelled = true; };
  }, [session]);

  function setPlan(nextPlan) {
    setPlanState((current) => {
      const currentPlan = current.plans.find((item) => item.id === current.activePlanId) || current.plans[0];
      const nextCourses = typeof nextPlan === "function" ? nextPlan(currentPlan?.courses || []) : nextPlan;
      return {
        ...current,
        plans: current.plans.map((item) => item.id === current.activePlanId
          ? { ...item, courses: nextCourses, updatedAt: Date.now() }
          : item),
      };
    });
  }

  async function savePlanManually() {
    if (session?.isDemo) {
      saveStudyPlans(studentStorageId, plans, activePlanId);
      setRemoteStatus("บัญชีตัวอย่าง · บันทึกในเครื่องแล้ว");
      setPlannerPopup({ tone: "success", title: "บันทึกแผนแล้ว", message: "แผนของบัญชีตัวอย่างถูกเก็บไว้ในเครื่องนี้" });
      return;
    }
    if (!remoteReady) {
      setPlannerPopup({ tone: "warning", title: "ยังเชื่อมพื้นที่เก็บแผนไม่ได้", message: "กรุณารอให้ระบบเชื่อมต่อ Supabase สำเร็จ แล้วลองบันทึกอีกครั้ง" });
      return;
    }
    setRemoteStatus("กำลังบันทึกแผน");
    try {
      await syncRemoteStudyPlans(session, planState);
      saveStudyPlans(studentStorageId, plans, activePlanId);
      setSavedPlanSignature(JSON.stringify(plans));
      setRemoteStatus("บันทึกแผนแล้ว");
      setPlannerPopup({ tone: "success", title: "บันทึกแผนแล้ว", message: "แผนนี้ถูกเก็บในบัญชีของคุณ และสามารถเลือกใช้ได้หลังเข้าสู่ระบบครั้งถัดไป" });
    } catch {
      setRemoteStatus("บันทึกขึ้นคลาวด์ไม่สำเร็จ");
      setPlannerPopup({ tone: "warning", title: "บันทึกแผนไม่สำเร็จ", message: "แผนยังอยู่บนหน้านี้ กรุณาลองบันทึกอีกครั้ง" });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    if (session?.isDemo) {
      setPassedCodes(new Set(catalogue.filter((course) => course.term <= 2).map((course) => course.code)));
      setLoadError("");
      return () => controller.abort();
    }
    async function loadTranscript() {
      try {
        const response = await fetch(`/api/grades?idcode=${encodeURIComponent(session.idcode)}`, {
          headers: { "x-access-token": session.token },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("ไม่สามารถนำผลการเรียนมาใช้ตรวจแผนได้");
        setPassedCodes(extractPassedCourses(await response.json()));
      } catch (error) {
        if (error.name !== "AbortError") setLoadError(error.message);
      }
    }
    loadTranscript();
    return () => controller.abort();
  }, [session.idcode, session.token]);

  const planByCode = useMemo(() => new Map(plan.map((entry) => [entry.code, entry])), [plan]);
  const selected = catalogue.find((course) => course.code === selectedCode) || catalogue[0];
  const followingCourses = catalogue.filter((course) => course.pre.includes(selected.code));
  const prerequisiteCodes = new Set(selected.pre);
  const followingCodes = new Set(followingCourses.map((course) => course.code));
  const relatedCodes = new Set([...prerequisiteCodes, ...followingCodes]);
  const creditsByTerm = useMemo(() => terms.map((term) => ({
    ...term,
    credits: plan.filter((entry) => entry.term === term.id)
      .reduce((total, entry) => total + (catalogue.find((course) => course.code === entry.code)?.credits || 0), 0),
  })), [plan]);

  useLayoutEffect(() => {
    function drawLinks() {
      const tree = treeRef.current;
      if (!tree) return;
      const treeRect = tree.getBoundingClientRect();
      const nextLinks = [];
      plan.forEach(({ code }) => {
        const course = catalogue.find((item) => item.code === code);
        course?.pre.forEach((preCode) => {
          if (selectedCode !== code && selectedCode !== preCode) return;
          const fromPlan = planByCode.get(preCode);
          const toPlan = planByCode.get(code);
          if (!fromPlan || !toPlan) return;
          const from = nodeRefs.current[preCode];
          const to = nodeRefs.current[code];
          if (!from || !to) return;
          const fromRect = from.getBoundingClientRect();
          const toRect = to.getBoundingClientRect();
          const fromCenter = (fromRect.left + fromRect.right) / 2 - treeRect.left;
          const toCenter = (toRect.left + toRect.right) / 2 - treeRect.left;
          const isVertical = Math.abs(fromCenter - toCenter) < 40;
          const isForward = fromRect.top < toRect.top;
          const x1 = isVertical
            ? fromCenter
            : (fromCenter < toCenter ? fromRect.right - treeRect.left : fromRect.left - treeRect.left);
          const x2 = isVertical
            ? toCenter
            : (fromCenter < toCenter ? toRect.left - treeRect.left : toRect.right - treeRect.left);
          const y1 = isVertical
            ? (isForward ? fromRect.bottom - treeRect.top : fromRect.top - treeRect.top)
            : fromRect.top + fromRect.height / 2 - treeRect.top;
          const y2 = isVertical
            ? (isForward ? toRect.top - treeRect.top : toRect.bottom - treeRect.top)
            : toRect.top + toRect.height / 2 - treeRect.top;
          nextLinks.push({ id: `${preCode}-${code}`, x1, y1, x2, y2, isVertical, blocked: prerequisiteStatus(course).includes(preCode) });
        });
      });
      setLinks(nextLinks);
    }
    drawLinks();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(drawLinks);
    if (treeRef.current && observer) observer.observe(treeRef.current);
    window.addEventListener("resize", drawLinks);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", drawLinks);
    };
  }, [plan, planByCode, passedCodes, selectedCode, activeYear]);

  function prerequisiteStatus(course) {
    const entry = planByCode.get(course.code);
    const missing = course.pre.filter((code) => {
      const prerequisitePlan = planByCode.get(code);
      return !passedCodes.has(code) && (!prerequisitePlan || (entry && prerequisitePlan.term >= entry.term));
    });
    return missing;
  }

  function removeCourse(code) {
    setUndoPlan(plan);
    setPlan((current) => current.filter((item) => item.code !== code));
    setPlanNotice("นำวิชาออกจากแผนแล้ว");
  }

  function moveCourse(code, term) {
    if (!code || !term) return;
    applyCourseMove(code, term);
    setSelectedCode(code);
    setDropTerm(null);
  }

  function applyCourseMove(code, term) {
    setUndoPlan(plan); // เก็บแผนก่อนย้ายไว้ให้เลิกทำได้
    const result = moveWithPrerequisiteFlow(plan, code, term, passedCodes);
    setPlan(result.plan);
    const movedCount = result.shiftedCodes.length;
    if (result.unresolvedCodes.length) {
      setPlanNotice(`ย้ายวิชาแล้ว แต่มี ${result.unresolvedCodes.length} วิชาที่ไม่มีเทอมถัดไปในแผน 4 ปี: ${result.unresolvedCodes.join(", ")} · ตรวจเงื่อนไขเส้นสีส้ม`);
    } else if (movedCount) {
      setPlanNotice(`เลื่อนวิชาตัวต่ออัตโนมัติ ${movedCount} วิชา: ${result.shiftedCodes.join(", ")} · ตรวจตำแหน่งใหม่บนแผน`);
    } else {
      setPlanNotice("ย้ายวิชาแล้ว · เลือกวิชาเพื่อดูเส้นทางวิชาบังคับก่อน");
    }
  }

  function showPlannerConfirmation({ title, message, confirmLabel = "ยืนยัน", tone = "standard", onConfirm }) {
    setPlannerConfirmation({ title, message, confirmLabel, tone, onConfirm });
  }

  function acceptPlannerConfirmation() {
    const action = plannerConfirmation?.onConfirm;
    setPlannerConfirmation(null);
    action?.();
  }

  function performAutoArrange() {
    setUndoPlan(plan);
    const result = autoArrangePlan(plan, passedCodes);
    setPlan(result.plan);
    setActiveYear(0);
    if (result.deferredCodes.length) {
      setPlannerPopup({ tone: "warning", title: "ยังจัดแผนไม่ครบ", message: `ยังวางไม่ได้ ${result.deferredCodes.length} วิชา: ${result.deferredCodes.join(", ")}\nกรุณาตรวจวิชาบังคับก่อน หรือขยายแผนเกิน 4 ปี` });
    } else {
      setPlannerPopup({ tone: "success", title: "จัดแผนอัตโนมัติแล้ว", message: result.movedCodes.length
        ? `ระบบปรับตำแหน่ง ${result.movedCodes.length} วิชาให้สอดคล้องกับเงื่อนไขแล้ว`
        : "แผนปัจจุบันผ่านเงื่อนไขแล้ว จึงไม่มีวิชาที่ต้องเลื่อน" });
    }
  }

  function runAutoArrange() {
    showPlannerConfirmation({
      title: "จัดแผนอัตโนมัติ",
      message: "ระบบจะคงวิชาที่ผ่านแล้ว ตรวจวิชาบังคับก่อน และจัดวิชาที่ยังไม่ผ่านให้ไม่เกิน 22 หน่วยกิตต่อเทอม",
      confirmLabel: "เริ่มจัดแผน",
      onConfirm: performAutoArrange,
    });
  }

  function runGuidedAutoPlan() {
    const targetTerm = Number(quickTargetTerm);
    if (!quickCourseCode || !targetTerm) {
      setPlannerPopup({
        tone: "warning",
        title: "เลือกข้อมูลให้ครบก่อน",
        message: "เลือกวิชาที่ต้องการย้าย และเทอมปลายทาง แล้วระบบจะจัดวิชาต่อเนื่องให้โดยอัตโนมัติ",
      });
      return;
    }
    const course = catalogue.find((item) => item.code === quickCourseCode);
    if (!course) return;
    setUndoPlan(plan);
    const moved = moveWithPrerequisiteFlow(plan, quickCourseCode, targetTerm, passedCodes);
    const arranged = autoArrangePlan(moved.plan, passedCodes);
    setPlan(arranged.plan);
    setSelectedCode(quickCourseCode);
    setActiveYear(Math.ceil(targetTerm / 2));
    const shifted = new Set([...moved.shiftedCodes, ...arranged.movedCodes]);
    const unavailable = arranged.deferredCodes.length;
    const shiftedList = [...shifted];
    setPlannerPopup(unavailable
      ? { tone: "warning", title: "ยังจัดแผนไม่ครบ", message: `ยังวางไม่ได้ ${unavailable} วิชา: ${arranged.deferredCodes.join(", ")}` }
      : { tone: "success", title: "จัดแผนเรียบร้อย", message: shiftedList.length
        ? `ระบบเลื่อนวิชาที่เกี่ยวข้อง ${shiftedList.length} วิชา\n${shiftedList.join(", ")}`
        : "แผนเดิมเป็นไปตามเงื่อนไขแล้ว จึงไม่มีวิชาที่ต้องเลื่อนตาม" });
  }

  function undoLastMove() {
    if (!undoPlan) return;
    setPlan(undoPlan);
    setUndoPlan(null);
    setPlanNotice("เลิกทำแล้ว");
  }

  function beginDrag(event, code) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", code);
    setDraggedCode(code);
  }

  function receiveDrop(event, term) {
    event.preventDefault();
    moveCourse(event.dataTransfer.getData("text/plain") || draggedCode, term);
    setDraggedCode("");
  }

  function resetPlan() {
    showPlannerConfirmation({
      title: "คืนค่าแผนตัวอย่าง",
      message: "แผนที่จัดไว้ตอนนี้จะถูกแทนที่ด้วยแผนเริ่มต้น แต่คุณยังสามารถใช้ปุ่มเลิกทำเพื่อย้อนกลับได้",
      confirmLabel: "คืนค่าแผน",
      onConfirm: () => {
        setUndoPlan(plan);
        setPlan(defaultCoursesForSession());
        setPlanNotice("คืนค่าแผนตัวอย่างแล้ว");
      },
    });
  }

  function applyPlanTemplate(type) {
    const templates = {
      standard: {
        name: "แผนตามหลักสูตร",
        description: "เริ่มจากผังรายวิชามาตรฐาน 140 หน่วยกิต",
        courses: defaultPlan(),
      },
      cooperative: {
        name: "แผนสหกิจศึกษา",
        description: "จัดวิชาเตรียมสหกิจในปี 3 ภาคปลาย และสหกิจในปี 4 ภาคปลาย",
        courses: defaultPlan().map((course) => {
          if (course.code === "03600390") return { ...course, term: 6 };
          if (course.code === "03600490") return { ...course, term: 8 };
          return course;
        }),
      },
      custom: {
        name: "แผนจัดเอง",
        description: "เริ่มจากแผนว่าง แล้วเพิ่มและย้ายวิชาด้วยตัวเอง",
        courses: [],
      },
    };
    const template = templates[type];
    if (!template) return;
    showPlannerConfirmation({
      title: `เปลี่ยนเป็น “${template.name}”`,
      message: `${template.description}\nแผนปัจจุบันจะถูกแทนที่`,
      confirmLabel: "เปลี่ยนแผน",
      onConfirm: () => {
        setUndoPlan(plan);
        setPlanState((current) => ({
          ...current,
          plans: current.plans.map((item) => item.id === current.activePlanId
            ? { ...item, name: template.name, courses: template.courses, updatedAt: Date.now() }
            : item),
        }));
        setActiveYear(0);
        setPlanNotice(`เปลี่ยนเป็น${template.name}แล้ว`);
      },
    });
  }

  function selectPlan(planId) {
    if (!plans.some((item) => item.id === planId)) return;
    setPlanState((current) => ({ ...current, activePlanId: planId }));
    setPlanNotice("");
  }

  function openCreatePlan() {
    setNewPlanName(`แผน ${plans.length + 1}`);
    setIsCreatePlanOpen(true);
  }

  function createPlan() {
    const name = newPlanName.trim().slice(0, 60);
    if (!name) {
      setPlannerPopup({ tone: "warning", title: "กรุณาตั้งชื่อแผน", message: "ชื่อแผนต้องมีอย่างน้อย 1 ตัวอักษร" });
      return;
    }
    if (plans.length >= 20) {
      setPlannerPopup({ tone: "warning", title: "สร้างแผนเพิ่มไม่ได้", message: "บัญชีหนึ่งเก็บแผนการเรียนได้สูงสุด 20 แผน" });
      return;
    }
    if (plans.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
      setPlannerPopup({ tone: "warning", title: "ชื่อนี้ถูกใช้งานแล้ว", message: "กรุณาตั้งชื่อแผนใหม่ที่แตกต่างจากแผนเดิม" });
      return;
    }
    const nextPlan = makeStudyPlan(name, defaultPlan());
    setPlanState((current) => ({ plans: [...current.plans, nextPlan], activePlanId: nextPlan.id }));
    setUndoPlan(null);
    setIsCreatePlanOpen(false);
    setPlanNotice("สร้างแผนใหม่แล้ว");
  }

  function duplicatePlan() {
    duplicatePlanFrom(activePlan);
  }

  function duplicatePlanFrom(planToCopy) {
    if (!planToCopy) return;
    const name = window.prompt("ชื่อสำเนาแผน", `${planToCopy.name} (สำเนา)`)?.trim();
    if (!name) return;
    const nextPlan = makeStudyPlan(name, planToCopy.courses);
    setPlanState((current) => ({ plans: [...current.plans, nextPlan], activePlanId: nextPlan.id }));
    setUndoPlan(null);
    setPlanNotice(`สร้างสำเนา “${nextPlan.name}” แล้ว`);
  }

  function renamePlan() {
    renamePlanById(activePlan?.id);
  }

  function renamePlanById(planId) {
    const planToRename = plans.find((item) => item.id === planId);
    if (!planToRename) return;
    const name = window.prompt("เปลี่ยนชื่อแผน", planToRename.name)?.trim().slice(0, 60);
    if (!name || name === planToRename.name) return;
    setPlanState((current) => ({
      ...current,
      plans: current.plans.map((item) => item.id === planToRename.id ? { ...item, name, updatedAt: Date.now() } : item),
    }));
  }

  function deletePlan() {
    deletePlanById(activePlan?.id);
  }

  function deletePlanById(planId) {
    const planToDelete = plans.find((item) => item.id === planId);
    if (!planToDelete) return;
    if (plans.length <= 1) {
      setPlanNotice("ต้องมีแผนการเรียนอย่างน้อย 1 แผน");
      return;
    }
    showPlannerConfirmation({
      title: `ลบแผน “${planToDelete.name}”`,
      message: "การลบแผนไม่สามารถย้อนกลับได้",
      confirmLabel: "ลบแผน",
      tone: "danger",
      onConfirm: () => {
        if (remoteReady) {
          deleteRemoteStudyPlan(session, planToDelete.id)
            .catch(() => setRemoteStatus("ลบแผนบนคลาวด์ไม่สำเร็จ · กรุณาลองอีกครั้ง"));
        }
        setPlanState((current) => {
          const nextPlans = current.plans.filter((item) => item.id !== planToDelete.id);
          return { plans: nextPlans, activePlanId: nextPlans[0].id };
        });
        setUndoPlan(null);
        setPlanNotice("ลบแผนการเรียนแล้ว");
      },
    });
  }

  async function openPlanHistory() {
    if (!activePlan?.id) return;
    if (!remoteReady) {
      setPlannerPopup({ tone: "warning", title: "ยังโหลดประวัติไม่ได้", message: "รอให้ระบบเชื่อมพื้นที่เก็บแผนก่อน แล้วลองอีกครั้ง" });
      return;
    }
    setIsHistoryOpen(true);
    setHistoryStatus("loading");
    try {
      const data = await fetchRemoteStudyPlanHistory(session, activePlan.id);
      setPlanHistory(Array.isArray(data.history) ? data.history : []);
      setHistoryStatus("ready");
    } catch (error) {
      setHistoryStatus("error");
    }
  }

  function restoreHistoryVersion(historyItem) {
    if (!historyItem?.courses?.length) return;
    setUndoPlan(plan);
    setPlan(historyItem.courses);
    setIsHistoryOpen(false);
    setPlanNotice("คืนค่าแผนจากประวัติแล้ว · ระบบกำลังบันทึกเป็นเวอร์ชันใหม่");
    setPlannerPopup({ tone: "success", title: "คืนค่าเวอร์ชันก่อนหน้าแล้ว", message: `แผนมี ${historyItem.courses.length} รายวิชา และบันทึกใหม่จะถูกเพิ่มในประวัติ` });
  }

  function exportPlan() {
    // The image is intentionally drawn from the plan data instead of the DOM.
    // It stays readable even when all eight terms contain many courses.
    const canvas = document.createElement("canvas");
    const width = 2880;
    const height = 1510;
    const scale = 1.5;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    context.scale(scale, scale);

    const roundedRect = (x, y, w, h, radius) => {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + w, y, x + w, y + h, radius);
      context.arcTo(x + w, y + h, x, y + h, radius);
      context.arcTo(x, y + h, x, y, radius);
      context.arcTo(x, y, x + w, y, radius);
      context.closePath();
    };
    const textLines = (text, maxWidth, maxLines = 2) => {
      const words = String(text).split(/\s+/);
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (context.measureText(next).width > maxWidth && line) {
          if (lines.length < maxLines) lines.push(line);
          line = word;
        } else line = next;
      });
      if (line && lines.length < maxLines) lines.push(line);
      if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
      }
      return lines;
    };
    const drawText = (text, x, y, maxWidth, lineHeight, maxLines) => {
      const lines = textLines(text, maxWidth, maxLines);
      lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
      return lines.length;
    };

    context.fillStyle = "#f5faf7";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#087a58";
    context.fillRect(0, 0, width, 14);
    context.fillStyle = "#123d2d";
    context.font = "700 52px system-ui, 'Noto Sans Thai', sans-serif";
    context.fillText(activePlan?.name || "แผนการเรียน", 74, 106);
    context.fillStyle = "#547066";
    context.font = "400 25px system-ui, 'Noto Sans Thai', sans-serif";
    context.fillText(`แผนการเรียน 4 ปี · ${totalPlannedCredits} / ${TOTAL_CREDITS} หน่วยกิต`, 76, 148);
    context.textAlign = "right";
    context.fillStyle = "#0a7655";
    context.font = "600 22px system-ui, 'Noto Sans Thai', sans-serif";
    context.fillText(studentName, width - 76, 106);
    context.fillStyle = "#6b8278";
    context.font = "400 18px system-ui, 'Noto Sans Thai', sans-serif";
    context.fillText(`บันทึกเมื่อ ${new Date().toLocaleDateString("th-TH")}`, width - 76, 140);
    context.textAlign = "left";

    const margin = 64;
    const gap = 24;
    const yearWidth = (width - margin * 2 - gap * 3) / 4;
    const termGap = 14;
    const termWidth = (yearWidth - termGap) / 2;
    const top = 205;
    const panelHeight = 1210;
    const yearColors = ["#dff3e9", "#dceff4", "#ece5f7", "#fff1c7"];

    [1, 2, 3, 4].forEach((year) => {
      const x = margin + (year - 1) * (yearWidth + gap);
      roundedRect(x, top, yearWidth, panelHeight, 22);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = "#d5e6dc";
      context.lineWidth = 2;
      context.stroke();
      roundedRect(x, top, yearWidth, 86, 22);
      context.fillStyle = yearColors[year - 1];
      context.fill();
      context.fillRect(x, top + 44, yearWidth, 42);
      const yearCredits = creditsByTerm.filter((term) => Math.ceil(term.id / 2) === year).reduce((sum, term) => sum + term.credits, 0);
      context.fillStyle = "#174534";
      context.font = "700 28px system-ui, 'Noto Sans Thai', sans-serif";
      context.fillText(`ปี ${year}`, x + 24, top + 54);
      context.textAlign = "right";
      context.font = "650 19px system-ui, 'Noto Sans Thai', sans-serif";
      context.fillText(`${yearCredits} หน่วยกิต`, x + yearWidth - 22, top + 51);
      context.textAlign = "left";

      [0, 1].forEach((termOffset) => {
        const termId = (year - 1) * 2 + termOffset + 1;
        const termX = x + 14 + termOffset * (termWidth + termGap);
        const termCourses = plan.filter((entry) => entry.term === termId)
          .map((entry) => catalogue.find((course) => course.code === entry.code))
          .filter(Boolean)
          .sort((a, b) => a.code.localeCompare(b.code));
        context.fillStyle = "#55756a";
        context.font = "650 18px system-ui, 'Noto Sans Thai', sans-serif";
        context.fillText(`ภาคเรียน ${termOffset + 1}`, termX + 8, top + 120);
        context.textAlign = "right";
        context.fillText(`${termCourses.reduce((sum, course) => sum + course.credits, 0)} นก.`, termX + termWidth - 8, top + 120);
        context.textAlign = "left";
        let courseY = top + 143;
        termCourses.forEach((course) => {
          const passed = passedCodes.has(course.code);
          roundedRect(termX, courseY, termWidth, 100, 13);
          context.fillStyle = passed ? "#f1fbf5" : "#ffffff";
          context.fill();
          context.strokeStyle = passed ? "#8bceaa" : "#d9e8df";
          context.lineWidth = 1.5;
          context.stroke();
          context.fillStyle = passed ? "#0c8059" : "#24624a";
          context.font = "700 17px ui-monospace, SFMono-Regular, monospace";
          context.fillText(course.code, termX + 15, courseY + 27);
          context.textAlign = "right";
          context.fillStyle = "#55766a";
          context.font = "650 15px system-ui, 'Noto Sans Thai', sans-serif";
          context.fillText(`${course.credits} นก.`, termX + termWidth - 15, courseY + 27);
          context.textAlign = "left";
          context.fillStyle = "#163b2c";
          context.font = "650 16px system-ui, 'Noto Sans Thai', sans-serif";
          drawText(courseTitle(course), termX + 15, courseY + 52, termWidth - 30, 20, 2);
          context.fillStyle = passed ? "#16845f" : "#778d83";
          context.font = "500 13px system-ui, 'Noto Sans Thai', sans-serif";
          context.fillText(passed ? "ผ่านแล้ว" : "อยู่ในแผน", termX + 15, courseY + 87);
          courseY += 112;
        });
      });
    });
    context.fillStyle = "#6e867b";
    context.font = "400 17px system-ui, 'Noto Sans Thai', sans-serif";
    context.fillText("PlanC · ภาพอ้างอิงสำหรับการวางแผนการเรียน", 74, height - 45);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.download = `PlanC-${(activePlan?.name || "study-plan").replace(/[^a-zA-Z0-9ก-๙-_]+/g, "-")}-${date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setPlanNotice("บันทึกภาพแผนการเรียนแล้ว");
  }

  function scrollToYear(year) {
    setActiveYear(year);
  }

  function focusCourse(code) {
    setSelectedCode(code);
    setIsDetailOpen(true);
    const courseTerm = planByCode.get(code)?.term;
    if (courseTerm) setActiveYear(Math.ceil(courseTerm / 2));
    requestAnimationFrame(() => {
      const target = nodeRefs.current[code];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }

  const totalPlannedCredits = creditsByTerm.reduce((total, term) => total + term.credits, 0);
  const visibleYears = activeYear === 0 ? [1, 2, 3, 4] : [activeYear];
  const hasUnsavedChanges = remoteReady && Boolean(savedPlanSignature) && savedPlanSignature !== JSON.stringify(plans);
  const remainingCredits = Math.max(0, TOTAL_CREDITS - totalPlannedCredits);
  const missingRequiredCourses = catalogue.filter((course) => !passedCodes.has(course.code) && !planByCode.has(course.code));
  const overloadedTerms = creditsByTerm.filter((term) => term.credits > MAX_TERM_CREDITS);
  const studentCode = session?.stdCode || session?.username || session?.idcode || "";
  const studentName = session?.name || session?.student?.stdNameTh || session?.student?.name || "นิสิต";
  const normalizedQuery = libraryQuery.trim().toLowerCase();
  const libraryCourses = catalogue.filter((course) => {
    if (planByCode.has(course.code)) return false;
    return !normalizedQuery || `${course.code} ${course.name} ${courseTitle(course)}`.toLowerCase().includes(normalizedQuery);
  });

  return (
    <div className={`planner-app ${showSidebar ? "sidebar-open" : "sidebar-closed"}`}>
      {plannerPopup && (
        <div className="planner-popup-layer" role="presentation" onMouseDown={() => setPlannerPopup(null)}>
          <section className={`planner-popup ${plannerPopup.tone}`} role="dialog" aria-modal="true" aria-labelledby="planner-popup-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="planner-popup-close" aria-label="ปิด" onClick={() => setPlannerPopup(null)}>×</button>
            <span className="planner-popup-icon">{plannerPopup.tone === "success" ? "✓" : "!"}</span>
            <div>
              <p>{plannerPopup.tone === "success" ? "PLAN UPDATED" : "ACTION NEEDED"}</p>
              <h2 id="planner-popup-title">{plannerPopup.title}</h2>
              <div className="planner-popup-message">{plannerPopup.message}</div>
            </div>
            <button type="button" className="planner-popup-confirm" onClick={() => setPlannerPopup(null)}>เข้าใจแล้ว</button>
          </section>
        </div>
      )}
      {plannerConfirmation && (
        <div className="planner-popup-layer" role="presentation" onMouseDown={() => setPlannerConfirmation(null)}>
          <section className={`planner-confirm-popup ${plannerConfirmation.tone}`} role="dialog" aria-modal="true" aria-labelledby="planner-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="planner-confirm-icon">?</span>
            <div>
              <p>ยืนยันการทำรายการ</p>
              <h2 id="planner-confirm-title">{plannerConfirmation.title}</h2>
              <div className="planner-popup-message">{plannerConfirmation.message}</div>
            </div>
            <div className="planner-confirm-actions"><button type="button" onClick={() => setPlannerConfirmation(null)}>ยกเลิก</button><button className="planner-confirm-accept" type="button" onClick={acceptPlannerConfirmation}>{plannerConfirmation.confirmLabel}</button></div>
          </section>
        </div>
      )}
      {isCreatePlanOpen && (
        <div className="planner-popup-layer" role="presentation" onMouseDown={() => setIsCreatePlanOpen(false)}>
          <section className="planner-create-popup" role="dialog" aria-modal="true" aria-labelledby="create-plan-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="planner-popup-close" aria-label="ปิด" onClick={() => setIsCreatePlanOpen(false)}>×</button>
            <p>NEW STUDY PLAN</p>
            <h2 id="create-plan-title">สร้างแผนการเรียนใหม่</h2>
            <span>เริ่มจากแผนตามหลักสูตร แล้วปรับให้เหมาะกับเป้าหมายของคุณ</span>
            <label htmlFor="new-plan-name">ชื่อแผน</label>
            <input id="new-plan-name" value={newPlanName} maxLength={60} autoFocus onChange={(event) => setNewPlanName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createPlan(); }} />
            <div className="planner-create-actions"><button type="button" onClick={() => setIsCreatePlanOpen(false)}>ยกเลิก</button><button type="button" onClick={createPlan}>สร้างแผน</button></div>
          </section>
        </div>
      )}
      {isHistoryOpen && (
        <div className="plan-history-layer" role="presentation" onMouseDown={() => setIsHistoryOpen(false)}>
          <section className="plan-history-modal" role="dialog" aria-modal="true" aria-labelledby="plan-history-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p>PLAN HISTORY</p><h2 id="plan-history-title">ประวัติแผน: {activePlan?.name}</h2><span>เลือกเวอร์ชันก่อนหน้าเพื่อคืนค่าแผน</span></div><button type="button" aria-label="ปิดประวัติแผน" onClick={() => setIsHistoryOpen(false)}>×</button></header>
            <div className="plan-history-list">
              {historyStatus === "loading" && <p className="plan-history-empty">กำลังโหลดประวัติแผน…</p>}
              {historyStatus === "error" && <p className="plan-history-empty">ไม่สามารถโหลดประวัติได้ กรุณาลองใหม่อีกครั้ง</p>}
              {historyStatus === "ready" && planHistory.length === 0 && <p className="plan-history-empty">ยังไม่มีประวัติที่บันทึกไว้</p>}
              {historyStatus === "ready" && planHistory.map((item, index) => <article className="plan-history-item" key={item.id}><div><span className={item.action === "created" ? "history-action created" : "history-action"}>{item.action === "created" ? "สร้างแผน" : "บันทึกการแก้ไข"}</span><strong>{index === 0 ? "เวอร์ชันล่าสุด" : `เวอร์ชันก่อนหน้า ${index}`}</strong><small>{new Date(item.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · {item.courses.length} รายวิชา</small></div><button type="button" disabled={index === 0} onClick={() => restoreHistoryVersion(item)}>{index === 0 ? "กำลังใช้งาน" : "คืนค่าเวอร์ชันนี้"}</button></article>)}
            </div>
          </section>
        </div>
      )}
      <button className="planner-sidebar-backdrop" type="button" aria-label="ปิดเมนู" onClick={() => setShowSidebar(false)} />
      <aside className="planner-sidebar" aria-label="เมนูหลัก">
        <NavLink className="planner-sidebar-brand" to="/dashboard">
          <span>PlanC</span>
          <svg viewBox="0 0 40 30" aria-hidden="true"><path d="M2 8 20 2l18 6-18 7L2 8Z" /><path d="M8 12v8c7 5 17 5 24 0v-8l-12 5-12-5Z" /><path d="M36 9v11" /></svg>
        </NavLink>
        <nav className="planner-sidebar-nav">
          <NavLink to="/dashboard"><PlannerNavIcon type="home" /><span>หน้าหลัก</span></NavLink>
          <NavLink to="/study-plan"><PlannerNavIcon type="plan" /><span>วางแผนการเรียน</span></NavLink>
          <NavLink to="/grades"><PlannerNavIcon type="grades" /><span>เช็ควิชาและหน่วยกิต</span></NavLink>
          <NavLink to="/cooperative-plan"><PlannerNavIcon type="calculator" /><span>ตรวจสิทธิ์สหกิจ</span></NavLink>
          <NavLink to="/profile"><PlannerNavIcon type="profile" /><span>โปรไฟล์</span></NavLink>
        </nav>
        <button className="planner-sidebar-logout" type="button" onClick={onLogout}>ออกจากระบบ</button>
      </aside>

      <div className="planner-app-content">
        <header className="planner-topbar">
          <button className="planner-menu-button" type="button" aria-label={showSidebar ? "ปิดเมนู" : "เปิดเมนู"} onClick={() => setShowSidebar((current) => !current)}>
            <span /><span /><span />
          </button>
          <div className="planner-user">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
            <span>{studentName}{studentCode ? ` ${studentCode}` : ""}</span>
          </div>
        </header>

        <div className="planner-content-scroll">
    <section className="planner-page">
      <div className="planner-title-row">
        <div>
          <p className="eyebrow">แผนการเรียน</p>
          <h1>วางแผนการเรียน</h1>
          <p className="planner-intro">ดูรายละเอียดวิชา ตรวจวิชาบังคับก่อน และลากวิชาเพื่อจัดแผนแต่ละภาคเรียน</p>
        </div>
      </div>

      <div className="plan-manager" aria-label="จัดการแผนการเรียน">
        <div className="plan-manager-actions">
          <button type="button" className="plan-create" onClick={openCreatePlan}>+ สร้างแผนใหม่</button>
          <button type="button" className="plan-save-manual" onClick={savePlanManually}>บันทึกแผน</button>
          <button type="button" className="plan-auto-arrange" onClick={runAutoArrange}>จัดแผนอัตโนมัติ</button>
          <button type="button" onClick={openPlanHistory}>ประวัติแผน</button>
          <button type="button" onClick={exportPlan}>บันทึกเป็นรูปภาพ</button>
          <button type="button" className="plan-delete" onClick={deletePlan}>ลบแผน</button>
        </div>
      </div>

      <section className="guided-planner" aria-labelledby="guided-planner-title">
        <div className="guided-planner-intro"><span>จัดแผนแบบง่าย</span><h2 id="guided-planner-title">ต้องการเลื่อนหรือดรอปวิชา?</h2><p>เลือกวิชาและเทอมใหม่ ระบบจะจัดวิชาต่อเนื่องให้ตามเงื่อนไข</p></div>
        <div className="guided-planner-steps">
          <label><b>1</b><span>เลือกวิชา</span><select value={quickCourseCode} onChange={(event) => setQuickCourseCode(event.target.value)}><option value="">เลือกรายวิชา</option>{catalogue.map((course) => <option key={course.code} value={course.code}>{course.code} · {courseTitle(course)}</option>)}</select></label>
          <label><b>2</b><span>เรียนใหม่ใน</span><select value={quickTargetTerm} onChange={(event) => setQuickTargetTerm(event.target.value)}><option value="">เลือกเทอม</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}</select></label>
          <button type="button" onClick={runGuidedAutoPlan}><span>3</span> จัดแผนให้อัตโนมัติ</button>
        </div>
      </section>

      <div className="planner-credit-row"><span>หน่วยกิตในแผน</span><strong>{totalPlannedCredits}</strong><small>/ {TOTAL_CREDITS} หน่วยกิต</small></div>
      <div className="credit-bar" role="progressbar" aria-label="หน่วยกิตในแผน" aria-valuemin={0} aria-valuemax={TOTAL_CREDITS} aria-valuenow={totalPlannedCredits}>
        <i style={{ width: `${Math.min(100, (totalPlannedCredits / TOTAL_CREDITS) * 100)}%` }} />
      </div>
      <div className="planner-audit" aria-label="สรุปตรวจแผนการเรียน">
        <div><span>หน่วยกิตที่เหลือ</span><strong>{remainingCredits}</strong><small>หน่วยกิต</small></div>
        <div className={missingRequiredCourses.length ? "audit-warning" : "audit-ok"}><span>วิชาที่ยังไม่อยู่ในแผน</span><strong>{missingRequiredCourses.length}</strong><small>รายวิชา</small></div>
        <div className={overloadedTerms.length ? "audit-warning" : "audit-ok"}><span>เทอมที่หน่วยกิตเกิน</span><strong>{overloadedTerms.length}</strong><small>เทอม</small></div>
      </div>

      {loadError && <p className="planner-notice">{loadError} ระบบยังตรวจจากแผนที่จัดไว้ได้</p>}

      <div className="year-overview" aria-label="สรุปหน่วยกิตแต่ละปี">
        <button className={`year-overview-card overview-all ${activeYear === 0 ? "active" : ""}`} type="button" onClick={() => scrollToYear(0)} aria-pressed={activeYear === 0}>
          <span className="year-overview-copy"><strong>ภาพรวม 4 ปี</strong><small>{totalPlannedCredits} หน่วยกิต</small></span>
        </button>
        {[1, 2, 3, 4].map((year) => {
          const yearTerms = creditsByTerm.filter((term) => Math.ceil(term.id / 2) === year);
          const credits = yearTerms.reduce((total, term) => total + term.credits, 0);
          return <button className={`year-overview-card year-${year} ${activeYear === year ? "active" : ""}`} type="button" key={year} onClick={() => scrollToYear(year)} aria-pressed={activeYear === year} aria-label={`เลือกปี ${year} ${credits} หน่วยกิต`}>
            <span className="year-overview-copy"><strong>ปี {year}</strong><small>{credits} หน่วยกิต</small></span>
          </button>;
        })}
      </div>

      <div className="planner-board-toolbar">
        <div><strong>{activeYear === 0 ? "ภาพรวมแผนการเรียน 4 ปี" : `แผนการเรียน ปี ${activeYear}`}</strong><span>เลือกวิชาเพื่อดูวิชาที่ต้องผ่านก่อน · ลากย้าย หรือแตะวิชาแล้วเลือกเทอมในแผงด้านข้าง</span></div>
        <div className="planner-legend"><span><i className="guide-dot passed-dot" /> ผ่านแล้ว</span><span><i className="guide-dot planned-dot" /> อยู่ในแผน</span><span><i className="guide-dot blocked-dot" /> ยังไม่ครบเงื่อนไข</span></div>
      </div>

      <div className={`planner-workspace roadmap-workspace ${isDetailOpen ? "details-open" : ""}`}>
        <div className={`planner-scroll roadmap-scroll ${activeYear === 0 ? "all-years-scroll" : ""}`} ref={scrollRef} aria-label={activeYear === 0 ? "ภาพรวมแผนการเรียน 4 ปี" : `แผนการเรียนปี ${activeYear}`}>
          <div className={`planner-map skill-tree roadmap-board ${activeYear === 0 ? "all-years" : ""}`} ref={treeRef}>
            <svg className="prerequisite-lines" aria-hidden="true">
              <defs><marker id="planner-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1 L9 5 L1 9" /></marker></defs>
              {links.map((link) => {
                const bend = Math.max(36, Math.abs(link.x2 - link.x1) * 0.42);
                const path = link.isVertical
                  ? `M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + (link.y2 - link.y1) * 0.45}, ${link.x2} ${link.y2 - (link.y2 - link.y1) * 0.45}, ${link.x2} ${link.y2 - Math.sign(link.y2 - link.y1) * 7}`
                  : `M ${link.x1} ${link.y1} C ${link.x1 + Math.sign(link.x2 - link.x1) * bend} ${link.y1}, ${link.x2 - Math.sign(link.x2 - link.x1) * bend} ${link.y2}, ${link.x2 - Math.sign(link.x2 - link.x1) * 8} ${link.y2}`;
                return <path key={link.id} markerEnd="url(#planner-arrow)" className={`active-link${link.blocked ? " blocked-link" : ""}`} d={path} />;
              })}
            </svg>
            {visibleYears.map((year) => <section className="year-column roadmap-year" key={year} ref={(element) => { yearRefs.current[year] = element; }}>
                <div className="year-header"><strong>ปีที่ {year}</strong><span>{creditsByTerm.filter((term) => Math.ceil(term.id / 2) === year).reduce((total, term) => total + term.credits, 0)} หน่วยกิต</span></div>
                <div className="year-terms">
                  {terms.filter((term) => Math.ceil(term.id / 2) === year).map((term) => {
                    const order = curriculumOrder[term.id - 1];
                    const courses = plan.filter((entry) => entry.term === term.id).map((entry) => catalogue.find((course) => course.code === entry.code)).filter(Boolean).sort((a, b) => {
                      const aIndex = order.indexOf(a.code); const bIndex = order.indexOf(b.code);
                      return (aIndex < 0 ? 1000 : aIndex) - (bIndex < 0 ? 1000 : bIndex);
                    });
                    const visibleCourses = courses.filter((course) => {
                      const missing = prerequisiteStatus(course);
                      if (courseFilter === "passed") return passedCodes.has(course.code);
                      if (courseFilter === "blocked") return missing.length > 0;
                      if (courseFilter === "planned") return !passedCodes.has(course.code) && missing.length === 0;
                      return true;
                    });
                    const creditInfo = creditsByTerm.find((item) => item.id === term.id);
                    const overloaded = creditInfo.credits > MAX_TERM_CREDITS;
                    return <article className={`term-column ${dropTerm === term.id ? "drop-target" : ""}`} key={term.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTerm(term.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTerm(null); }} onDrop={(event) => receiveDrop(event, term.id)}>
                      <div className={overloaded ? "term-header overload" : "term-header"}><span>{term.id % 2 ? "ภาคต้น" : "ภาคปลาย"}</span><strong>{creditInfo.credits} หน่วยกิต{overloaded ? ` · เกิน ${MAX_TERM_CREDITS}` : ""}</strong></div>
                      <div className="term-courses">
                        {visibleCourses.length === 0 && <p className="empty-term">{courses.length ? "ไม่มีวิชาในสถานะนี้" : "ลากวิชามาวางในภาคเรียนนี้"}</p>}
                        {visibleCourses.map((course) => {
                          const missing = prerequisiteStatus(course); const isPassed = passedCodes.has(course.code); const isSelected = selectedCode === course.code;
                          const isPrerequisite = prerequisiteCodes.has(course.code);
                          const isFollowing = followingCodes.has(course.code);
                          return <button type="button" title={`Select ${course.code}: ${courseTitle(course)}`} aria-pressed={isSelected} className={`course-node ${shouldUseThaiDisplay(course) ? "non-major-course" : "major-course"} ${isSelected ? "selected" : ""} ${relatedCodes.has(course.code) ? "related" : ""} ${isPrerequisite ? "prerequisite-highlight" : ""} ${isFollowing ? "following-highlight" : ""} ${isPassed ? "passed" : ""} ${missing.length ? "blocked" : ""}`} key={course.code} onClick={() => { setSelectedCode(course.code); setIsDetailOpen(false); }} draggable onDragStart={(event) => beginDrag(event, course.code)} onDragEnd={() => { setDraggedCode(""); setDropTerm(null); }} ref={(element) => { nodeRefs.current[course.code] = element; }}>
                            <span className="course-copy"><span className="course-code">{course.code}</span><strong className="course-name">{courseTitle(course)}</strong></span>
                            <span className="course-credit">{course.credits} นก.</span>
                            <span className="course-state">{isPrerequisite ? `วิชาบังคับก่อน${isPassed ? " · ผ่านแล้ว" : ""}` : isFollowing ? "วิชาที่เรียนต่อได้" : isPassed ? "✓ ผ่านแล้ว" : missing.length ? `! ต้องผ่าน ${missing.join(", ")} ก่อน` : "อยู่ในแผน"}</span>
                            {isSelected && course.pre.length > 0 && <span className="course-prerequisite-popover" role="tooltip"><strong>ก่อนเรียนวิชานี้ ต้องผ่าน</strong><span>{course.pre.map((code) => { const prerequisite = catalogue.find((item) => item.code === code); return <b key={code}>{code} · {prerequisite ? courseTitle(prerequisite) : code}</b>; })}</span></span>}
                          </button>;
                        })}
                      </div>
                    </article>;
                  })}
                </div>
            </section>)}
          </div>
        </div>
        <p className="planner-scroll-hint">เลือกปีจากแถบด้านบน · ลากวิชาย้ายระหว่าง 2 เทอมได้ · วิชาต่อเนื่องจะเลื่อนตามอัตโนมัติ</p>

        <aside className={`planner-panel ${isDetailOpen ? "is-open" : ""}`} id="planner-panel" aria-hidden={!isDetailOpen}>
          <button className="planner-panel-close" type="button" aria-label="ปิดรายละเอียดวิชา" onClick={() => setIsDetailOpen(false)}>×</button>
          <div className="panel-section">
            <p className="panel-label">รายละเอียดวิชา</p>
            <div className="drawer-course-header"><span>{selected.code}</span><h2>{courseTitle(selected)}</h2></div>
            <div className="drawer-course-meta"><span>{selected.credits} หน่วยกิต</span><span>{planByCode.has(selected.code) ? terms[planByCode.get(selected.code).term - 1]?.label : "ยังไม่อยู่ในแผน"}</span></div>
            <div className="drawer-detail-group"><p className="prerequisite-label">วิชาที่ต้องผ่านก่อน</p>
            {selected.pre.length ? <div className="prerequisite-list">{selected.pre.map((code) => { const course = catalogue.find((item) => item.code === code); return <button type="button" key={code} onClick={() => focusCourse(code)}>{code} · {course ? courseTitle(course) : code}</button>; })}</div> : <p className="muted">ไม่มีวิชาบังคับก่อน</p>}</div>
            <div className="drawer-detail-group"><p className="prerequisite-label">วิชาที่เรียนต่อได้</p>
            {followingCourses.length ? <div className="prerequisite-list">{followingCourses.map((course) => <button type="button" key={course.code} onClick={() => focusCourse(course.code)}>{course.code} · {courseTitle(course)}</button>)}</div> : <p className="muted">ยังไม่มีวิชาที่เชื่อมต่อในแผนตัวอย่าง</p>}</div>
            {prerequisiteStatus(selected).length > 0 && <p className="validation-warning">ยังต้องวางหรือผ่าน: {prerequisiteStatus(selected).join(", ")}</p>}
          </div>

          <div className="quick-move">
            <p className="panel-label">{planByCode.has(selected.code) ? "ย้ายไปภาคเรียน" : "เพิ่มลงภาคเรียน"}</p>
            <div className="term-chips">
              {terms.map((term) => {
                const current = planByCode.get(selected.code)?.term === term.id;
                return (
                  <button
                    type="button"
                    key={term.id}
                    className={current ? "term-chip current" : "term-chip"}
                    aria-pressed={current}
                    aria-label={term.label}
                    onClick={() => moveCourse(selected.code, term.id)}
                  >
                    <span>ปี {Math.ceil(term.id / 2)}</span><small>เทอม {(term.id % 2) || 2}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <details className="course-library">
            <summary>เพิ่มวิชาจากคลัง</summary>
            <input
              type="search"
              className="library-search"
              placeholder="ค้นหารหัสหรือชื่อวิชา"
              aria-label="ค้นหาวิชาในคลัง"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
            />
            <div className="library-list">
              {libraryCourses.map((course) => (
                <button
                  type="button"
                  className="library-course"
                  key={course.code}
                  draggable
                  onDragStart={(event) => beginDrag(event, course.code)}
                  onDragEnd={() => { setDraggedCode(""); setDropTerm(null); }}
                  onClick={() => { setSelectedCode(course.code); setIsDetailOpen(true); }}
                >
                  <strong>{course.code}</strong><span>{courseTitle(course)}</span><em>{course.credits} หน่วยกิต</em>
                </button>
              ))}
              {libraryCourses.length === 0 && (
                <p className="muted">{catalogue.every((course) => planByCode.has(course.code)) ? "วางวิชาจากคลังครบแล้ว" : "ไม่พบวิชาที่ค้นหา"}</p>
              )}
            </div>
          </details>

          <div className="planner-panel-actions">{planByCode.has(selected.code) && <button className="planner-danger" type="button" onClick={() => removeCourse(selected.code)}>นำวิชานี้ออกจากแผน</button>}
            <button className="planner-reset" type="button" onClick={resetPlan}>คืนค่าแผนตัวอย่าง</button></div>
        </aside>
      </div>
    </section>
          <footer className="planner-footer"><button type="button" onClick={() => alert("ระบบแจ้งปัญหา: กรุณาส่งรายละเอียดปัญหาให้ทีมพัฒนา PlanC")}>แจ้งปัญหาการใช้งาน</button></footer>
        </div>
      </div>
    </div>
  );
}
