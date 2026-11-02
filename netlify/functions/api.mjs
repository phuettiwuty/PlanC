import { createClient } from "@supabase/supabase-js";
let kuApiPromise;

function getKuApi() {
  // Loading this lazily prevents a missing or malformed KU setting from
  // taking the complete API function offline (Netlify would otherwise reply 502).
  kuApiPromise ??= import("../../ku-login.mjs");
  return kuApiPromise;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

const verifiedSessions = new Map();
const DEMO_STUDENT_ID = "6612345678";
const DEMO_TOKEN = "planc-demo-year2";
const demoGrades = {
  results: [
    { year: "2568/1/", semester: "ภาคต้น", grade: [
      { subject_code: "03603211", subject_name_en: "Discrete Mathematics", credit: 3, grade: "B+" },
      { subject_code: "03603221", subject_name_en: "Digital Systems Design", credit: 3, grade: "A" },
      { subject_code: "03603222", subject_name_en: "Logic Circuit Laboratory", credit: 1, grade: "A" },
    ] },
    { year: "2567/2/", semester: "ภาคปลาย", grade: [
      { subject_code: "01417168", subject_name_en: "Engineering Mathematics II", credit: 3, grade: "A" },
      { subject_code: "03603112", subject_name_en: "Programming Fundamentals II", credit: 3, grade: "B+" },
      { subject_code: "01420112", subject_name_en: "General Physics II", credit: 3, grade: "B" },
    ] },
    { year: "2567/1/", semester: "ภาคต้น", grade: [
      { subject_code: "01417167", subject_name_en: "Engineering Mathematics I", credit: 3, grade: "A" },
      { subject_code: "03603111", subject_name_en: "Programming Fundamentals I", credit: 3, grade: "A" },
      { subject_code: "01420111", subject_name_en: "General Physics I", credit: 3, grade: "B+" },
    ] },
  ],
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function requestPath(request) {
  const pathname = new URL(request.url).pathname;
  const functionPrefix = "/.netlify/functions/api";
  return pathname.startsWith(functionPrefix)
    ? `/api${pathname.slice(functionPrefix.length)}`
    : pathname;
}

function tokenOf(request) {
  return request.headers.get("x-access-token") || "";
}

function isDemoRequest(request, idcode) {
  return idcode === DEMO_STUDENT_ID && tokenOf(request) === DEMO_TOKEN;
}

function normalizePlan(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim().slice(0, 60);
  if (!name) return null;
  const courses = Array.isArray(raw.courses)
    ? raw.courses
      .filter((course) => course && /^[A-Z0-9-]{3,24}$/i.test(String(course.code || "")) && Number.isInteger(course.term) && course.term >= 1 && course.term <= 8)
      .map((course) => ({ code: String(course.code), term: course.term }))
    : [];
  return {
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(raw.id || "")) ? raw.id : null,
    name,
    courses,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

async function verifyKuSession(request, idcode) {
  const token = tokenOf(request);
  if (!idcode || !token) throw new Error("Missing KU session");
  const cacheKey = `${idcode}:${token}`;
  const cached = verifiedSessions.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;
  const { kuGetGrades, kuGetProfile } = await getKuApi();
  let profile = await kuGetProfile(token, idcode);
  if (!profile) {
    await kuGetGrades(token, idcode);
    profile = {};
  }
  verifiedSessions.set(cacheKey, { profile, expiresAt: Date.now() + 5 * 60 * 1000 });
  return profile;
}

async function getPlanOwner(request, idcode) {
  if (!supabase) throw new Error("Supabase is not configured");
  const kuProfile = await verifyKuSession(request, idcode);
  const { data: existing, error: existingError } = await supabase.from("profiles").select("id").eq("student_code", idcode).maybeSingle();
  if (existingError) throw existingError;
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${idcode}@planc.local`, email_confirm: true, user_metadata: { student_code: idcode },
    });
    if (error) throw error;
    userId = data.user.id;
  }
  const displayName = kuProfile.stdNameTh || kuProfile.name || kuProfile.displayName || null;
  const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, student_code: idcode, display_name: displayName, updated_at: new Date().toISOString() });
  if (profileError) throw profileError;
  return userId;
}

async function readPlansForUser(userId) {
  const { data: rows, error } = await supabase.from("study_plans").select("id, name, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  if (!rows.length) return [];
  const { data: history, error: historyError } = await supabase.from("study_plan_history").select("plan_id, snapshot, created_at").in("plan_id", rows.map((row) => row.id)).order("created_at", { ascending: false });
  if (historyError) throw historyError;
  const latestSnapshot = new Map();
  for (const item of history || []) if (!latestSnapshot.has(item.plan_id)) latestSnapshot.set(item.plan_id, item.snapshot);
  return rows.map((row) => {
    const snapshot = latestSnapshot.get(row.id) || {};
    return { id: row.id, name: row.name, courses: Array.isArray(snapshot.courses) ? snapshot.courses : [], createdAt: new Date(row.created_at).getTime(), updatedAt: new Date(row.updated_at).getTime() };
  });
}

async function readPlanHistoryForUser(userId, planId) {
  const { data: plan, error: planError } = await supabase.from("study_plans").select("id, name").eq("id", planId).eq("user_id", userId).maybeSingle();
  if (planError) throw planError;
  if (!plan) {
    const error = new Error("ไม่พบแผนการเรียนนี้");
    error.statusCode = 404;
    throw error;
  }
  const { data: history, error: historyError } = await supabase.from("study_plan_history").select("id, action, snapshot, created_at").eq("plan_id", planId).order("created_at", { ascending: false }).limit(30);
  if (historyError) throw historyError;
  return { planName: plan.name, history: (history || []).map((item) => ({ id: item.id, action: item.action, courses: Array.isArray(item.snapshot?.courses) ? item.snapshot.courses : [], createdAt: item.created_at })) };
}

function planErrorResponse(error) {
  console.error("Study plan API error:", error.message);
  return json({ error: "ไม่สามารถบันทึกแผนการเรียนได้ในขณะนี้" }, error.statusCode || 500);
}

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = requestPath(request);

  try {
    if (pathname === "/api/login" && request.method === "POST") {
      const { username, password } = await request.json().catch(() => ({}));
      if (!username || !password) return json({ error: "กรุณากรอกรหัสนิสิตและรหัสผ่าน" }, 400);
      const { kuLogin } = await getKuApi();
      return json(await kuLogin(username, password));
    }

    if (pathname === "/api/grades" && request.method === "GET") {
      const idcode = url.searchParams.get("idcode");
      if (!idcode || !tokenOf(request)) return json({ error: "Missing idcode query param or x-access-token header" }, 400);
      if (isDemoRequest(request, idcode)) return json(demoGrades);
      const { kuGetGrades } = await getKuApi();
      return json(await kuGetGrades(tokenOf(request), idcode));
    }

    if (pathname === "/api/profile" && request.method === "GET") {
      const idcode = url.searchParams.get("idcode");
      if (!idcode || !tokenOf(request)) return json({ error: "Missing idcode query param or x-access-token header" }, 400);
      if (isDemoRequest(request, idcode)) return json({ stdCode: DEMO_STUDENT_ID, stdNameTh: "นิสิตตัวอย่าง ปี 2", facultyNameTh: "คณะวิศวกรรมศาสตร์", majorNameTh: "วิศวกรรมคอมพิวเตอร์", year: 2 });
      const { kuGetProfile } = await getKuApi();
      return json((await kuGetProfile(tokenOf(request), idcode)) || {});
    }

    if (pathname === "/api/study-plans" && request.method === "GET") {
      try {
        const plans = await readPlansForUser(await getPlanOwner(request, url.searchParams.get("idcode")));
        return json({ plans });
      } catch (error) { return planErrorResponse(error); }
    }

    if (pathname === "/api/study-plans/sync" && request.method === "POST") {
      try {
        const userId = await getPlanOwner(request, url.searchParams.get("idcode"));
        const body = await request.json().catch(() => ({}));
        const incomingPlans = Array.isArray(body.plans) ? body.plans.map(normalizePlan).filter(Boolean).slice(0, 20) : [];
        if (!incomingPlans.length) return json({ error: "ต้องมีแผนการเรียนอย่างน้อย 1 แผน" }, 400);
        const { data: existing, error: existingError } = await supabase.from("study_plans").select("id, updated_at").eq("user_id", userId);
        if (existingError) throw existingError;
        const existingById = new Map((existing || []).map((plan) => [plan.id, plan]));
        for (const plan of incomingPlans) {
          let planId = plan.id;
          const previous = planId ? existingById.get(planId) : null;
          if (previous) {
            if (plan.updatedAt <= new Date(previous.updated_at).getTime()) continue;
            const { error } = await supabase.from("study_plans").update({ name: plan.name, updated_at: new Date(plan.updatedAt).toISOString() }).eq("id", planId).eq("user_id", userId);
            if (error) throw error;
          } else {
            const insert = { user_id: userId, name: plan.name, created_at: new Date(plan.createdAt).toISOString(), updated_at: new Date(plan.updatedAt).toISOString() };
            if (planId) insert.id = planId;
            const { data, error } = await supabase.from("study_plans").insert(insert).select("id").single();
            if (error) throw error;
            planId = data.id;
          }
          const { error } = await supabase.from("study_plan_history").insert({ plan_id: planId, action: previous ? "updated" : "created", snapshot: { courses: plan.courses } });
          if (error) throw error;
        }
        return json({ ok: true });
      } catch (error) { return planErrorResponse(error); }
    }

    const historyMatch = pathname.match(/^\/api\/study-plans\/([0-9a-f-]{36})\/history$/i);
    if (historyMatch && request.method === "GET") {
      try {
        return json(await readPlanHistoryForUser(await getPlanOwner(request, url.searchParams.get("idcode")), historyMatch[1]));
      } catch (error) { return planErrorResponse(error); }
    }

    const deleteMatch = pathname.match(/^\/api\/study-plans\/([0-9a-f-]{36})$/i);
    if (deleteMatch && request.method === "DELETE") {
      try {
        const { error } = await supabase.from("study_plans").delete().eq("id", deleteMatch[1]).eq("user_id", await getPlanOwner(request, url.searchParams.get("idcode")));
        if (error) throw error;
        return json({ ok: true });
      } catch (error) { return planErrorResponse(error); }
    }

    return json({ error: "ไม่พบ API ที่เรียกใช้" }, 404);
  } catch (error) {
    const status = pathname === "/api/login" ? 401 : pathname === "/api/grades" || pathname === "/api/profile" ? 502 : 500;
    return json({ error: error.message || "ไม่สามารถดำเนินการได้" }, status);
  }
}
