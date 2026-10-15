import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  { code: "03600013", name: "Essential Computer Tools and Skills", credits: 1, term: 2, pre: [] },
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
  return englishCourseNames[course.code] || course.name;
}

const terms = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  label: `ปี ${Math.floor(index / 2) + 1} · เทอม ${(index % 2) + 1}`,
}));

const PASSING_GRADES = new Set(["A", "B+", "B", "C+", "C", "D+", "D", "S"]);
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

  for (let pass = 0; pass < terms.length; pass += 1) {
    let changed = false;
    for (const course of catalogue) {
      const entry = nextPlan.find((item) => item.code === course.code);
      if (!entry || !course.pre.length) continue;
      const prerequisiteTerms = course.pre
        .filter((prerequisiteCode) => !passedCodes.has(prerequisiteCode))
        .map((prerequisiteCode) => nextPlan.find((item) => item.code === prerequisiteCode)?.term)
        .filter(Number.isInteger);
      if (!prerequisiteTerms.length) continue;

      const latestPrerequisiteTerm = Math.max(...prerequisiteTerms);
      if (entry.term > latestPrerequisiteTerm) continue;
      const nextAvailableTerm = latestPrerequisiteTerm + 1;
      if (nextAvailableTerm > terms.length) {
        unresolvedCodes.add(course.code);
        continue;
      }
      entry.term = nextAvailableTerm;
      shiftedCodes.add(course.code);
      unresolvedCodes.delete(course.code);
      changed = true;
    }
    if (!changed) break;
  }

  return { plan: nextPlan, shiftedCodes: [...shiftedCodes], unresolvedCodes: [...unresolvedCodes] };
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

export default function StudyPlanner({ session }) {
  const [plan, setPlan] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : defaultPlan();
    } catch {
      return defaultPlan();
    }
  });
  const [selectedCode, setSelectedCode] = useState(catalogue[0].code);
  const [chosenCode, setChosenCode] = useState(catalogue[0].code);
  const [chosenTerm, setChosenTerm] = useState(1);
  const [passedCodes, setPassedCodes] = useState(new Set());
  const [loadError, setLoadError] = useState("");
  const [draggedCode, setDraggedCode] = useState("");
  const [dropTerm, setDropTerm] = useState(null);
  const [links, setLinks] = useState([]);
  const [planNotice, setPlanNotice] = useState("");
  const treeRef = useRef(null);
  const scrollRef = useRef(null);
  const yearRefs = useRef({});
  const nodeRefs = useRef({});

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    const controller = new AbortController();
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
  const relatedCodes = new Set([...selected.pre, ...followingCourses.map((course) => course.code)]);
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
  }, [plan, planByCode, passedCodes, selectedCode]);

  function prerequisiteStatus(course) {
    const entry = planByCode.get(course.code);
    const missing = course.pre.filter((code) => {
      const prerequisitePlan = planByCode.get(code);
      return !passedCodes.has(code) && (!prerequisitePlan || (entry && prerequisitePlan.term >= entry.term));
    });
    return missing;
  }

  function addOrMoveCourse(event) {
    event.preventDefault();
    const course = catalogue.find((item) => item.code === chosenCode);
    if (!course || !Number.isInteger(Number(chosenTerm))) return;
    applyCourseMove(course.code, Number(chosenTerm));
    setSelectedCode(course.code);
  }

  function removeCourse(code) {
    setPlan((current) => current.filter((item) => item.code !== code));
  }

  function moveCourse(code, term) {
    if (!code || !term) return;
    applyCourseMove(code, term);
    setSelectedCode(code);
    setDropTerm(null);
  }

  function applyCourseMove(code, term) {
    const result = moveWithPrerequisiteFlow(plan, code, term, passedCodes);
    setPlan(result.plan);
    const movedCount = result.shiftedCodes.length;
    if (result.unresolvedCodes.length) {
      setPlanNotice(`ย้ายวิชาแล้ว แต่มี ${result.unresolvedCodes.length} วิชาที่ไม่มีเทอมถัดไปในแผน 4 ปี: ${result.unresolvedCodes.join(", ")} · ตรวจเงื่อนไขเส้นสีส้ม`);
    } else if (movedCount) {
      setPlanNotice(`เลื่อนวิชาต่อเนื่องตามวิชาบังคับก่อนให้อัตโนมัติ ${movedCount} วิชา · ตรวจตำแหน่งใหม่บนแผน`);
    } else {
      setPlanNotice("ย้ายวิชาแล้ว · เลือกวิชาเพื่อดูเส้นทางวิชาบังคับก่อน");
    }
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
    setPlan(defaultPlan());
    setPlanNotice("คืนค่าแผนตัวอย่างแล้ว");
  }

  function scrollToYear(year) {
    const target = yearRefs.current[year];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  }

  function focusCourse(code) {
    setSelectedCode(code);
    requestAnimationFrame(() => {
      const target = nodeRefs.current[code];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }

  const totalPlannedCredits = creditsByTerm.reduce((total, term) => total + term.credits, 0);

  return (
    <section className="planner-page">
      <div className="planner-title-row">
        <div>
          <p className="eyebrow">แผนการเรียน</p>
          <h1>หลักสูตรของฉัน</h1>
          <p className="planner-intro">ดูรายวิชาตามปีและภาคเรียน เลือกวิชาเพื่อดูเส้นทางวิชาบังคับก่อน แล้วลากการ์ดเพื่อปรับแผน</p>
        </div>
        <div className="planner-summary"><span>หน่วยกิตในแผน</span><div><strong>{totalPlannedCredits}</strong><span>/ 140</span></div></div>
      </div>

      {loadError && <p className="planner-notice">{loadError} ระบบยังตรวจจากแผนที่จัดไว้ได้</p>}
      {planNotice && <p className="planner-plan-notice" role="status">{planNotice}</p>}

      <div className="year-overview" aria-label="สรุปหน่วยกิตแต่ละปี">
        {[1, 2, 3, 4].map((year) => {
          const yearTerms = creditsByTerm.filter((term) => Math.ceil(term.id / 2) === year);
          const credits = yearTerms.reduce((total, term) => total + term.credits, 0);
          return <button className="year-overview-card" type="button" key={year} onClick={() => scrollToYear(year)} aria-label={`ไปปี ${year} ${credits} หน่วยกิต`}>
            <span className="year-overview-number">0{year}</span>
            <span className="year-overview-copy"><strong>ปีที่ {year}</strong><small>ภาคต้น {yearTerms[0].credits} · ภาคปลาย {yearTerms[1].credits} หน่วยกิต</small></span>
            <span className="year-overview-credit">{credits} <small>หน่วยกิต</small></span>
          </button>;
        })}
      </div>

      <div className="planner-board-toolbar">
        <div><strong>รายวิชาแยกตามภาคเรียน</strong><span>เลือกวิชาเพื่อดูวิชาที่ต้องผ่านก่อน · เมื่อลากย้าย วิชาต่อเนื่องจะเลื่อนตามให้อัตโนมัติ</span></div>
        <div className="planner-legend"><span><i className="guide-dot passed-dot" /> ผ่านแล้ว</span><span><i className="guide-dot planned-dot" /> อยู่ในแผน</span><span><i className="guide-dot blocked-dot" /> ยังไม่ครบเงื่อนไข</span></div>
      </div>

      <div className="planner-workspace">
        <div className="planner-scroll" ref={scrollRef} aria-label="แผนการเรียนเลื่อนดูจากปี 1 ถึงปี 4">
          <div className="planner-map skill-tree" ref={treeRef}>
            <svg className="prerequisite-lines" aria-hidden="true">
              <defs><marker id="planner-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1 L9 5 L1 9" /></marker></defs>
              {links.map((link) => {
                const bend = Math.max(36, Math.abs(link.x2 - link.x1) * 0.42);
                const path = link.isVertical
                  ? `M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + (link.y2 - link.y1) * 0.45}, ${link.x2} ${link.y2 - (link.y2 - link.y1) * 0.45}, ${link.x2} ${link.y2 - Math.sign(link.y2 - link.y1) * 7}`
                  : `M ${link.x1} ${link.y1} C ${link.x1 + Math.sign(link.x2 - link.x1) * bend} ${link.y1}, ${link.x2 - Math.sign(link.x2 - link.x1) * bend} ${link.y2}, ${link.x2 - Math.sign(link.x2 - link.x1) * 8} ${link.y2}`;
                return <path key={link.id} markerEnd="url(#planner-arrow)" className={link.blocked ? "blocked-link" : ""} d={path} />;
              })}
            </svg>
            {[1, 2, 3, 4].map((year) => (
              <section className="year-column" key={year} ref={(element) => { yearRefs.current[year] = element; }}>
                <div className="year-header"><strong>ปีที่ {year}</strong><span>{creditsByTerm.filter((term) => Math.ceil(term.id / 2) === year).reduce((total, term) => total + term.credits, 0)} หน่วยกิต</span></div>
                <div className="year-terms">
                  {terms.filter((term) => Math.ceil(term.id / 2) === year).map((term) => {
                    const order = curriculumOrder[term.id - 1];
                    const courses = plan.filter((entry) => entry.term === term.id).map((entry) => catalogue.find((course) => course.code === entry.code)).filter(Boolean).sort((a, b) => {
                      const aIndex = order.indexOf(a.code); const bIndex = order.indexOf(b.code);
                      return (aIndex < 0 ? 1000 : aIndex) - (bIndex < 0 ? 1000 : bIndex);
                    });
                    const creditInfo = creditsByTerm.find((item) => item.id === term.id);
                    return <article className={`term-column ${dropTerm === term.id ? "drop-target" : ""}`} key={term.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTerm(term.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTerm(null); }} onDrop={(event) => receiveDrop(event, term.id)}>
                      <div className={creditInfo.credits > 22 ? "term-header overload" : "term-header"}><span>{term.id % 2 ? "ภาคต้น" : "ภาคปลาย"}</span><strong>{creditInfo.credits} หน่วยกิต</strong></div>
                      <div className="term-courses">
                        {courses.length === 0 && <p className="empty-term">ลากวิชามาวางในภาคเรียนนี้</p>}
                        {courses.map((course) => {
                          const missing = prerequisiteStatus(course); const isPassed = passedCodes.has(course.code); const isSelected = selectedCode === course.code;
                          return <button type="button" title={`Select ${course.code}: ${courseTitle(course)}`} aria-pressed={isSelected} className={`course-node ${isSelected ? "selected" : ""} ${relatedCodes.has(course.code) ? "related" : ""} ${isPassed ? "passed" : ""} ${missing.length ? "blocked" : ""}`} key={course.code} onClick={() => { setSelectedCode(course.code); setChosenCode(course.code); setChosenTerm(term.id); }} draggable onDragStart={(event) => beginDrag(event, course.code)} onDragEnd={() => { setDraggedCode(""); setDropTerm(null); }} ref={(element) => { nodeRefs.current[course.code] = element; }}>
                            <span className="course-copy"><span className="course-code">{course.code}</span><strong className="course-name">{courseTitle(course)}</strong></span>
                            <span className="course-credit">{course.credits} นก.</span>
                            <span className="course-state">{isPassed ? "✓ ผ่านแล้ว" : missing.length ? "! เช็กวิชาบังคับก่อน" : "อยู่ในแผน"}</span>
                          </button>;
                        })}
                      </div>
                    </article>;
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
        <p className="planner-scroll-hint">เลื่อนซ้าย–ขวาเพื่อดูปี 1–4 · ลากวิชาไปภาคเรียนใหม่ได้ · วิชาต่อเนื่องจะเลื่อนตามอัตโนมัติ</p>

        <aside className="planner-panel">
          <div className="panel-section">
            <p className="panel-label">วิชาที่เลือก</p>
            <div className="selected-course-heading"><div><span>{selected.code}</span><h2>{courseTitle(selected)}</h2></div></div>
            <p className="selected-credit">{selected.credits} หน่วยกิต · {planByCode.has(selected.code) ? terms[planByCode.get(selected.code).term - 1]?.label : "ยังไม่อยู่ในแผน"}</p>
            <p className="prerequisite-label">วิชาที่ต้องผ่านก่อน</p>
            {selected.pre.length ? <div className="prerequisite-list">{selected.pre.map((code) => { const course = catalogue.find((item) => item.code === code); return <button type="button" key={code} onClick={() => focusCourse(code)}>{code} · {course ? courseTitle(course) : code}</button>; })}</div> : <p className="muted">ไม่มีวิชาบังคับก่อน</p>}
            <p className="prerequisite-label">วิชาที่เรียนต่อได้</p>
            {followingCourses.length ? <div className="prerequisite-list">{followingCourses.map((course) => <button type="button" key={course.code} onClick={() => focusCourse(course.code)}>{course.code} · {courseTitle(course)}</button>)}</div> : <p className="muted">ยังไม่มีวิชาที่เชื่อมต่อในแผนตัวอย่าง</p>}
            {prerequisiteStatus(selected).length > 0 && <p className="validation-warning">ยังต้องวางหรือผ่าน: {prerequisiteStatus(selected).join(", ")}</p>}
          </div>

          <form className="plan-form" onSubmit={addOrMoveCourse}>
            <p className="panel-label">จัดวิชาในแผน</p>
            <label htmlFor="planner-course">รายวิชา</label>
            <select id="planner-course" value={chosenCode} onChange={(event) => setChosenCode(event.target.value)}>
              {catalogue.map((course) => <option key={course.code} value={course.code}>{course.code} · {courseTitle(course)}</option>)}
            </select>
            <label htmlFor="planner-term">ลงในเทอม</label>
            <select id="planner-term" value={chosenTerm} onChange={(event) => setChosenTerm(Number(event.target.value))}>
              {terms.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}
            </select>
            <button className="planner-primary" type="submit">บันทึกในแผน</button>
          </form>

          <div className="course-library">
            <p className="panel-label">คลังวิชา · ลากเข้าผัง</p>
            <div className="library-list">
              {catalogue.filter((course) => !planByCode.has(course.code)).map((course) => (
                <button
                  type="button"
                  className="library-course"
                  key={course.code}
                  draggable
                  onDragStart={(event) => beginDrag(event, course.code)}
                  onDragEnd={() => { setDraggedCode(""); setDropTerm(null); }}
                  onClick={() => setSelectedCode(course.code)}
                >
                  <strong>{course.code}</strong><span>{courseTitle(course)}</span><em>{course.credits} หน่วยกิต</em>
                </button>
              ))}
              {catalogue.every((course) => planByCode.has(course.code)) && <p className="muted">วางวิชาจากคลังครบแล้ว</p>}
            </div>
          </div>

          <div className="planner-panel-actions">{planByCode.has(selected.code) && <button className="planner-danger" type="button" onClick={() => removeCourse(selected.code)}>นำวิชานี้ออกจากแผน</button>}
            <button className="planner-reset" type="button" onClick={resetPlan}>คืนค่าแผนตัวอย่าง</button></div>
        </aside>
      </div>
    </section>
  );
}
