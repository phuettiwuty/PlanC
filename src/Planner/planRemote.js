function sessionHeaders(session) {
  return {
    "Content-Type": "application/json",
    "x-access-token": session?.token || "",
  };
}

function studentId(session) {
  return session?.idcode || session?.stdCode || session?.username || "";
}

async function request(session, path, options = {}) {
  const idcode = studentId(session);
  if (!idcode || !session?.token) throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ KU");
  const response = await fetch(`${path}?idcode=${encodeURIComponent(idcode)}`, {
    ...options,
    headers: { ...sessionHeaders(session), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ไม่สามารถเชื่อมต่อพื้นที่เก็บแผนได้");
  return data;
}

export function fetchRemoteStudyPlans(session) {
  return request(session, "/api/study-plans", { method: "GET" });
}

export function syncRemoteStudyPlans(session, state) {
  return request(session, "/api/study-plans/sync", {
    method: "POST",
    body: JSON.stringify({ plans: state.plans }),
  });
}

export function deleteRemoteStudyPlan(session, planId) {
  return request(session, `/api/study-plans/${encodeURIComponent(planId)}`, { method: "DELETE" });
}
