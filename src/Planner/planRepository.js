const STORAGE_VERSION = "planc-study-plans-v1";
const LEGACY_PLAN_KEY = "planc-study-plan-v2";

function createId() {
  return globalThis.crypto?.randomUUID?.() || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(studentId) {
  return `${STORAGE_VERSION}-${studentId || "guest"}`;
}

function sanitizeCourses(courses) {
  if (!Array.isArray(courses)) return [];
  return courses
    .filter((entry) => entry && typeof entry.code === "string" && Number.isInteger(entry.term))
    .map((entry) => ({ code: entry.code, term: entry.term }));
}

function sanitizePlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  const name = String(plan.name || "แผนการเรียนของฉัน").trim().slice(0, 60) || "แผนการเรียนของฉัน";
  return {
    id: String(plan.id || createId()),
    name,
    courses: sanitizeCourses(plan.courses),
    createdAt: Number(plan.createdAt) || Date.now(),
    updatedAt: Number(plan.updatedAt) || Date.now(),
  };
}

export function loadStudyPlans(studentId, defaultCourses) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(studentId)) || "null");
    if (Array.isArray(saved?.plans) && saved.plans.length) {
      const plans = saved.plans.map(sanitizePlan).filter(Boolean);
      if (plans.length) {
        const activePlanId = plans.some((plan) => plan.id === saved.activePlanId) ? saved.activePlanId : plans[0].id;
        return { plans, activePlanId };
      }
    }

    // Bring the previous single-plan storage forward so existing users keep their work.
    const legacyCourses = sanitizeCourses(JSON.parse(localStorage.getItem(LEGACY_PLAN_KEY) || "null"));
    const firstPlan = {
      id: createId(),
      name: "แผนหลัก",
      courses: legacyCourses.length ? legacyCourses : sanitizeCourses(defaultCourses),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { plans: [firstPlan], activePlanId: firstPlan.id };
  } catch {
    const firstPlan = { id: createId(), name: "แผนหลัก", courses: sanitizeCourses(defaultCourses), createdAt: Date.now(), updatedAt: Date.now() };
    return { plans: [firstPlan], activePlanId: firstPlan.id };
  }
}

export function saveStudyPlans(studentId, plans, activePlanId) {
  const payload = {
    plans: plans.map(sanitizePlan).filter(Boolean),
    activePlanId,
    savedAt: Date.now(),
  };
  localStorage.setItem(storageKey(studentId), JSON.stringify(payload));
}

export function makeStudyPlan(name, courses) {
  const cleanName = String(name || "แผนใหม่").trim().slice(0, 60) || "แผนใหม่";
  const now = Date.now();
  return { id: createId(), name: cleanName, courses: sanitizeCourses(courses), createdAt: now, updatedAt: now };
}

// This repository has the same load/save boundary that will be replaced by Supabase.
