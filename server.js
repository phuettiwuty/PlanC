import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { kuLogin, kuGetGrades, kuGetProfile } from "./ku-login.mjs";

/* ── Paths ─────────────────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Vite loads .env.local for the browser, but this lightweight Node server does
// not. Load only simple KEY=value lines so the secret remains server-side.
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.join(__dirname, envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
const port = process.env.PORT || (process.argv.includes("--api") ? 3001 : 3000);
const publicDirectory = path.join(__dirname, "outputs");
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
    {
      year: "2568/1/", semester: "ภาคต้น", grade: [
        { subject_code: "03603211", subject_name_en: "Discrete Mathematics", credit: 3, grade: "B+" },
        { subject_code: "03603221", subject_name_en: "Digital Systems Design", credit: 3, grade: "A" },
        { subject_code: "03603222", subject_name_en: "Logic Circuit Laboratory", credit: 1, grade: "A" },
      ],
    },
    {
      year: "2567/2/", semester: "ภาคปลาย", grade: [
        { subject_code: "01417168", subject_name_en: "Engineering Mathematics II", credit: 3, grade: "A" },
        { subject_code: "03603112", subject_name_en: "Programming Fundamentals II", credit: 3, grade: "B+" },
        { subject_code: "01420112", subject_name_en: "General Physics II", credit: 3, grade: "B" },
      ],
    },
    {
      year: "2567/1/", semester: "ภาคต้น", grade: [
        { subject_code: "01417167", subject_name_en: "Engineering Mathematics I", credit: 3, grade: "A" },
        { subject_code: "03603111", subject_name_en: "Programming Fundamentals I", credit: 3, grade: "A" },
        { subject_code: "01420111", subject_name_en: "General Physics I", credit: 3, grade: "B+" },
      ],
    },
  ],
};

function isDemoRequest(req, idcode) {
  return idcode === DEMO_STUDENT_ID && req.headers["x-access-token"] === DEMO_TOKEN;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/* ── Helpers ───────────────────────────────────────────────────── */

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendPlanError(res, error) {
  console.error("Study plan API error:", error.message);
  sendJSON(res, 500, { error: "ไม่สามารถบันทึกแผนการเรียนได้ในขณะนี้" });
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

async function verifyKuSession(req, idcode) {
  const token = req.headers["x-access-token"];
  if (!idcode || !token) throw new Error("Missing KU session");
  const cacheKey = `${idcode}:${token}`;
  const cached = verifiedSessions.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;
  let profile = await kuGetProfile(token, idcode);
  // KU's profile endpoint does not respond consistently for every account.
  // A successful grade request is an equivalent authenticated KU request for
  // this student ID, so it is a safe fallback before writing personal plans.
  if (!profile) {
    await kuGetGrades(token, idcode);
    profile = {};
  }
  verifiedSessions.set(cacheKey, { profile, expiresAt: Date.now() + 5 * 60 * 1000 });
  return profile;
}

async function getPlanOwner(req, idcode) {
  if (!supabase) throw new Error("Supabase is not configured");
  const kuProfile = await verifyKuSession(req, idcode);
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("student_code", idcode)
    .maybeSingle();
  if (existingError) throw existingError;
  let userId = existing?.id;

  // KU remains the authentication authority. This internal Supabase user only
  // owns rows and is never exposed as a browser login account.
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${idcode}@planc.local`,
      email_confirm: true,
      user_metadata: { student_code: idcode },
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const displayName = kuProfile.stdNameTh || kuProfile.name || kuProfile.displayName || null;
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    student_code: idcode,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return userId;
}

async function readPlansForUser(userId) {
  const { data: rows, error } = await supabase
    .from("study_plans")
    .select("id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const { data: history, error: historyError } = await supabase
    .from("study_plan_history")
    .select("plan_id, snapshot, created_at")
    .in("plan_id", ids)
    .order("created_at", { ascending: false });
  if (historyError) throw historyError;
  const latestSnapshot = new Map();
  for (const item of history || []) {
    if (!latestSnapshot.has(item.plan_id)) latestSnapshot.set(item.plan_id, item.snapshot);
  }
  return rows.map((row) => {
    const snapshot = latestSnapshot.get(row.id) || {};
    return {
      id: row.id,
      name: row.name,
      courses: Array.isArray(snapshot.courses) ? snapshot.courses : [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  });
}

async function readPlanHistoryForUser(userId, planId) {
  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .select("id, name")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) {
    const error = new Error("ไม่พบแผนการเรียนนี้");
    error.statusCode = 404;
    throw error;
  }

  const { data: history, error: historyError } = await supabase
    .from("study_plan_history")
    .select("id, action, snapshot, created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (historyError) throw historyError;
  return {
    planName: plan.name,
    history: (history || []).map((item) => ({
      id: item.id,
      action: item.action,
      courses: Array.isArray(item.snapshot?.courses) ? item.snapshot.courses : [],
      createdAt: item.created_at,
    })),
  };
}

/* ── Server ────────────────────────────────────────────────────── */

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    /* ── API: Login ────────────────────────────────────────────── */
    if (url.pathname === "/api/login" && req.method === "POST") {
      try {
        const { username, password } = await parseBody(req);
        if (!username || !password) {
          sendJSON(res, 400, { error: "กรุณากรอกรหัสนิสิตและรหัสผ่าน" });
          return;
        }
        const data = await kuLogin(username, password);
        sendJSON(res, 200, data);
      } catch (err) {
        sendJSON(res, 401, { error: err.message || "เข้าสู่ระบบไม่สำเร็จ" });
      }
      return;
    }

    /* ── API: Grades ───────────────────────────────────────────── */
    if (url.pathname === "/api/grades" && req.method === "GET") {
      try {
        const idcode = url.searchParams.get("idcode");
        const token = req.headers["x-access-token"];

        if (!idcode || !token) {
          sendJSON(res, 400, {
            error: "Missing idcode query param or x-access-token header",
          });
          return;
        }

        if (isDemoRequest(req, idcode)) {
          sendJSON(res, 200, demoGrades);
          return;
        }

        const data = await kuGetGrades(token, idcode);
        sendJSON(res, 200, data);
      } catch (err) {
        sendJSON(res, 502, {
          error: err.message || "ไม่สามารถดึงข้อมูลเกรดได้",
        });
      }
      return;
    }

    /* ── API: Profile ──────────────────────────────────────────── */
    if (url.pathname === "/api/profile" && req.method === "GET") {
      try {
        const idcode = url.searchParams.get("idcode");
        const token = req.headers["x-access-token"];

        if (!idcode || !token) {
          sendJSON(res, 400, {
            error: "Missing idcode query param or x-access-token header",
          });
          return;
        }

        if (isDemoRequest(req, idcode)) {
          sendJSON(res, 200, {
            stdCode: DEMO_STUDENT_ID,
            stdNameTh: "นิสิตตัวอย่าง ปี 2",
            facultyNameTh: "คณะวิศวกรรมศาสตร์",
            majorNameTh: "วิศวกรรมคอมพิวเตอร์",
            year: 2,
          });
          return;
        }

        const data = await kuGetProfile(token, idcode);
        sendJSON(res, 200, data || {});
      } catch (err) {
        sendJSON(res, 502, {
          error: err.message || "ไม่สามารถดึงข้อมูลโปรไฟล์ได้",
        });
      }
      return;
    }

    /* ── API: Study plans (KU-authenticated, Supabase-persisted) ── */
    if (url.pathname === "/api/study-plans" && req.method === "GET") {
      try {
        const idcode = url.searchParams.get("idcode");
        const userId = await getPlanOwner(req, idcode);
        const plans = await readPlansForUser(userId);
        sendJSON(res, 200, { plans });
      } catch (err) {
        sendPlanError(res, err);
      }
      return;
    }

    if (url.pathname === "/api/study-plans/sync" && req.method === "POST") {
      try {
        const idcode = url.searchParams.get("idcode");
        const userId = await getPlanOwner(req, idcode);
        const body = await parseBody(req);
        const incomingPlans = Array.isArray(body.plans) ? body.plans.map(normalizePlan).filter(Boolean).slice(0, 20) : [];
        if (!incomingPlans.length) {
          sendJSON(res, 400, { error: "ต้องมีแผนการเรียนอย่างน้อย 1 แผน" });
          return;
        }

        const { data: existing, error: existingError } = await supabase
          .from("study_plans")
          .select("id, updated_at")
          .eq("user_id", userId);
        if (existingError) throw existingError;
        const existingById = new Map((existing || []).map((plan) => [plan.id, plan]));

        for (const plan of incomingPlans) {
          let planId = plan.id;
          const previous = planId ? existingById.get(planId) : null;
          if (previous) {
            const previousUpdatedAt = new Date(previous.updated_at).getTime();
            if (plan.updatedAt <= previousUpdatedAt) continue;
            const { error: updateError } = await supabase
              .from("study_plans")
              .update({ name: plan.name, updated_at: new Date(plan.updatedAt).toISOString() })
              .eq("id", planId)
              .eq("user_id", userId);
            if (updateError) throw updateError;
          } else {
            const newPlan = {
              user_id: userId,
              name: plan.name,
              created_at: new Date(plan.createdAt).toISOString(),
              updated_at: new Date(plan.updatedAt).toISOString(),
            };
            if (planId) newPlan.id = planId;
            const { data, error: insertError } = await supabase
              .from("study_plans")
              .insert(newPlan)
              .select("id")
              .single();
            if (insertError) throw insertError;
            planId = data.id;
          }
          const { error: historyError } = await supabase.from("study_plan_history").insert({
            plan_id: planId,
            action: previous ? "updated" : "created",
            snapshot: { courses: plan.courses },
          });
          if (historyError) throw historyError;
        }
        sendJSON(res, 200, { ok: true });
      } catch (err) {
        sendPlanError(res, err);
      }
      return;
    }

    const historyMatch = url.pathname.match(/^\/api\/study-plans\/([0-9a-f-]{36})\/history$/i);
    if (historyMatch && req.method === "GET") {
      try {
        const idcode = url.searchParams.get("idcode");
        const userId = await getPlanOwner(req, idcode);
        const history = await readPlanHistoryForUser(userId, historyMatch[1]);
        sendJSON(res, 200, history);
      } catch (err) {
        sendPlanError(res, err);
      }
      return;
    }

    const deletePlanMatch = url.pathname.match(/^\/api\/study-plans\/([0-9a-f-]{36})$/i);
    if (deletePlanMatch && req.method === "DELETE") {
      try {
        const idcode = url.searchParams.get("idcode");
        const userId = await getPlanOwner(req, idcode);
        const { error } = await supabase
          .from("study_plans")
          .delete()
          .eq("id", deletePlanMatch[1])
          .eq("user_id", userId);
        if (error) throw error;
        sendJSON(res, 200, { ok: true });
      } catch (err) {
        sendPlanError(res, err);
      }
      return;
    }

    /* ── Static files ──────────────────────────────────────────── */
    const reqPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.resolve(publicDirectory, `.${reqPath}`);

    if (!filePath.startsWith(publicDirectory)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        // Serve the React entry point for client-side routes such as /grades.
        if (!path.extname(reqPath)) {
          fs.readFile(path.join(publicDirectory, "index.html"), (indexError, index) => {
            if (indexError) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(index);
          });
          return;
        }
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
      });
      res.end(content);
    });
  })
  .listen(port, () => {
    console.log(`\n  🎓 KU Grade Viewer`);
    console.log(`  ➜ http://localhost:${port}\n`);
  });
