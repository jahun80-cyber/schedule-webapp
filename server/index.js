// 외부 패키지 없이 Node.js 내장 기능만으로 동작하는 API 서버입니다.
// (express, cors 등 별도 설치가 필요 없습니다 - npm install만 하면 바로 실행됩니다)
const http = require("http");
const fs = require("fs");
const path = require("path");

// .env 파일이 있으면 간단히 읽어서 process.env에 반영 (dotenv 패키지 없이 자체 구현)
(function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const { readDb, writeDb } = require("./db");
const { roleFromPassword } = require("./auth");
const { defaultStoreConfig } = require("./seed");

const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-app-password",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function checkAuth(req, requiredRole) {
  const pw = req.headers["x-app-password"] || "";
  const role = roleFromPassword(pw);
  if (!role) return { ok: false, status: 401, error: "비밀번호가 올바르지 않습니다." };
  if (requiredRole === "admin" && role !== "admin") {
    return { ok: false, status: 403, error: "관리자만 할 수 있는 작업입니다." };
  }
  return { ok: true, role };
}

/* ---------- 정적 파일 서빙 ---------- */
function serveStatic(req, res, pathname) {
  let filePath = path.join(CLIENT_DIST, pathname === "/" ? "index.html" : pathname);
  if (!filePath.startsWith(CLIENT_DIST)) { send(res, 403, "Forbidden"); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 라우팅: 없는 경로는 index.html로 폴백
      fs.readFile(path.join(CLIENT_DIST, "index.html"), (err2, data2) => {
        if (err2) {
          send(res, 404, "빌드된 프론트엔드가 없습니다. client 폴더에서 npm run build를 먼저 실행하세요.");
        } else {
          send(res, 200, data2, { "Content-Type": "text/html; charset=utf-8" });
        }
      });
      return;
    }
    const ext = path.extname(filePath);
    send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
  });
}

/* ---------- API 라우팅 ---------- */
async function handleApi(req, res, pathname, method) {
  try {
    // POST /api/login
    if (pathname === "/api/login" && method === "POST") {
      const body = await readBody(req);
      const role = roleFromPassword(body.password || "");
      if (!role) return sendJson(res, 401, { error: "비밀번호가 올바르지 않습니다." });
      return sendJson(res, 200, { ok: true, role });
    }

    if (pathname === "/api/health") return sendJson(res, 200, { ok: true });

    // GET /api/backup - 전체 데이터를 파일로 내려받기 (관리자 전용)
    if (pathname === "/api/backup" && method === "GET") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const db = readDb();
      return sendJson(res, 200, db);
    }

    // POST /api/restore - 백업 파일로 전체 데이터 덮어쓰기 (관리자 전용)
    if (pathname === "/api/restore" && method === "POST") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      if (!body || !Array.isArray(body.stores) || typeof body.storeData !== "object") {
        return sendJson(res, 400, { error: "올바른 백업 파일이 아닙니다." });
      }
      await writeDb((db) => {
        db.stores = body.stores;
        db.storeData = body.storeData;
      });
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/stores
    if (pathname === "/api/stores" && method === "GET") {
      const auth = checkAuth(req, "staff");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const db = readDb();
      return sendJson(res, 200, db.stores);
    }

    // POST /api/stores
    if (pathname === "/api/stores" && method === "POST") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      const name = (body.name || "").trim();
      if (!name) return sendJson(res, 400, { error: "매장 이름을 입력하세요." });
      const id = "store_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      await writeDb((db) => {
        db.stores.push({ id, name });
        const cfg = defaultStoreConfig();
        cfg.settings.storeName = name;
        db.storeData[id] = { config: cfg, schedule: null };
      });
      return sendJson(res, 200, { id, name });
    }

    // /api/stores/:id ...
    const storeMatch = pathname.match(/^\/api\/stores\/([^/]+)(\/(config|schedule))?$/);
    if (storeMatch) {
      const id = decodeURIComponent(storeMatch[1]);
      const sub = storeMatch[3]; // undefined | 'config' | 'schedule'

      if (!sub && method === "PUT") {
        const auth = checkAuth(req, "admin");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        let found = false;
        await writeDb((db) => {
          const s = db.stores.find((s) => s.id === id);
          if (s && body.name) { s.name = body.name; found = true; }
        });
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        return sendJson(res, 200, { ok: true });
      }

      if (!sub && method === "DELETE") {
        const auth = checkAuth(req, "admin");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        await writeDb((db) => {
          db.stores = db.stores.filter((s) => s.id !== id);
          delete db.storeData[id];
        });
        return sendJson(res, 200, { ok: true });
      }

      if (sub && method === "GET") {
        const auth = checkAuth(req, "staff");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const db = readDb();
        const entry = db.storeData[id];
        if (!entry) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        if (sub === "config") return sendJson(res, 200, entry.config || defaultStoreConfig());
        return sendJson(res, 200, entry.schedule || null);
      }

      if (sub && method === "PUT") {
        const auth = checkAuth(req, "staff");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        let found = false;
        await writeDb((db) => {
          if (!db.storeData[id]) return;
          db.storeData[id][sub] = body;
          found = true;
        });
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        return sendJson(res, 200, { ok: true });
      }
    }

    sendJson(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: "서버 오류: " + e.message });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") return send(res, 204, "");

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname, method);
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  const admin = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD;
  if (!admin && !staff) {
    console.log("⚠ ADMIN_PASSWORD / STAFF_PASSWORD 환경변수가 없어 누구나 관리자 권한으로 접속됩니다. (로컬 테스트용)");
  }
});
