import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { kuLogin, kuGetGrades, kuGetProfile } from "./ku-login.mjs";

/* ── Paths ─────────────────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || (process.argv.includes("--api") ? 3001 : 3000);
const publicDirectory = path.join(__dirname, "outputs");

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

        const data = await kuGetProfile(token, idcode);
        sendJSON(res, 200, data || {});
      } catch (err) {
        sendJSON(res, 502, {
          error: err.message || "ไม่สามารถดึงข้อมูลโปรไฟล์ได้",
        });
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
