import crypto from "crypto";
import https from "https";
import { readFileSync } from "fs";

/* ── Load .env ─────────────────────────────────────────────────── */

function loadEnvironment() {
  let content;
  try {
    content = readFileSync(new URL(".env", import.meta.url), "utf8");
  } catch {
    return; // .env is optional when vars are set externally
  }

  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, name] = match;
    let value = match[2].trim();

    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      value = value.slice(1);

      while (!value.endsWith(quote) && index + 1 < lines.length) {
        index += 1;
        value += `\n${lines[index]}`;
      }

      if (!value.endsWith(quote)) {
        throw new Error(`Unclosed quoted value for ${name} in .env`);
      }

      value = value.slice(0, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    if (process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

loadEnvironment();

/* ── Config ────────────────────────────────────────────────────── */

const KU_APP_KEY = process.env.KU_APP_KEY;
const KU_PUBLIC_KEY = process.env.KU_PUBLIC_KEY;

if (!KU_APP_KEY || !KU_PUBLIC_KEY) {
  throw new Error("Missing KU_APP_KEY or KU_PUBLIC_KEY in environment");
}

function normalizePublicKey(pem) {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");

  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("KU_PUBLIC_KEY is not a valid PEM public key");
  }

  return [
    "-----BEGIN PUBLIC KEY-----",
    ...base64.match(/.{1,64}/g),
    "-----END PUBLIC KEY-----",
  ].join("\n");
}

const NORMALIZED_KU_PUBLIC_KEY = normalizePublicKey(KU_PUBLIC_KEY);

const BASE_HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,th-TH;q=0.8,th;q=0.7",
  "app-key": KU_APP_KEY,
  "content-type": "application/json",
  origin: "https://my.ku.th",
  referer: "https://my.ku.th/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
};

/* ── Helpers ───────────────────────────────────────────────────── */

export const rsaEncrypt = (str) =>
  crypto
    .publicEncrypt(
      {
        key: NORMALIZED_KU_PUBLIC_KEY,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(str)
    )
    .toString("base64");

/** POST JSON to my.ku.th and return { status, data } */
const post = (path, body, extraHeaders = {}) =>
  new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "my.ku.th",
        path,
        method: "POST",
        headers: {
          ...BASE_HEADERS,
          ...extraHeaders,
          "content-length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });

/** GET from my.ku.th and return { status, data } */
const get = (path, extraHeaders = {}) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "my.ku.th",
        path,
        method: "GET",
        headers: { ...BASE_HEADERS, ...extraHeaders },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Login to my.ku.th with username & password.
 * Returns the full response object (contains accesstoken, user info, etc.).
 */
export async function kuLogin(username, password) {
  const body = {
    username: rsaEncrypt(username),
    password: rsaEncrypt(password),
  };

  const { status, data } = await post("/myku/api/v2/user-login/login", body);

  if (status === 200 && data.accesstoken) {
    return data;
  }

  const message =
    typeof data === "object" && data !== null
      ? data.message ?? data.error ?? `Unexpected response (HTTP ${status})`
      : String(data);
  throw new Error(message);
}

/**
 * Fetch grade data for a student.
 * @param {string} accesstoken – token received from kuLogin()
 * @param {string} idcode      – student ID code (e.g. "6630300548")
 */
export async function kuGetGrades(accesstoken, idcode) {
  const { status, data } = await get(
    `/myku/api/std-profile/checkGrades?idcode=${encodeURIComponent(idcode)}`,
    { "x-access-token": accesstoken }
  );

  if (status === 200) {
    return data;
  }

  const message =
    typeof data === "object" && data !== null
      ? data.message ?? data.error ?? `Failed to fetch grades (HTTP ${status})`
      : String(data);
  throw new Error(message);
}

/**
 * Fetch profile data for a student.
 */
export async function kuGetProfile(accesstoken, idcode) {
  const candidates = [
    `/myku/api/std-profile/getStdProfile?idcode=${encodeURIComponent(idcode)}`,
    `/myku/api/std-profile/info?idcode=${encodeURIComponent(idcode)}`,
    `/myku/api/std-profile/student-info`,
  ];

  for (const candidatePath of candidates) {
    try {
      const { status, data } = await get(candidatePath, {
        "x-access-token": accesstoken,
      });
      if (status === 200 && data && typeof data === "object") {
        return data;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

