// 실제 요청 라우팅 로직. 로컬 개발 서버(server/index.js)와 Vercel 서버리스 함수(api/[[...path]].js)가
// 이 파일의 handleRequest(req, res)를 그대로 가져다 씁니다 - 로직 중복 없음.
const fs = require("fs");
const path = require("path");

const db = require("./db");
const { roleFromPassword } = require("./auth");
const { defaultStoreConfig } = require("./seed");

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

function getClientIp(req) {
  // Vercel/프록시 뒤에서는 x-forwarded-for에 실제 접속자 IP가 담겨 온다 (맨 앞 값이 접속자)
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
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

/* ---------- 정적 파일 서빙 (로컬/Docker 전용 - Vercel에서는 outputDirectory가 대신 서빙) ---------- */
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
    // POST /api/login (같은 접속자가 15분 안에 너무 여러 번 틀리면 잠시 막음 - 무차별 대입 방지)
    if (pathname === "/api/login" && method === "POST") {
      const ip = getClientIp(req);
      const okToTry = await db.checkLoginRateLimit(ip).catch(() => true); // 확인 자체가 실패하면 막지 않음(가용성 우선)
      if (!okToTry) {
        return sendJson(res, 429, { error: "비밀번호를 너무 여러 번 틀렸습니다. 15분 후 다시 시도해주세요." });
      }
      const body = await readBody(req);
      const role = roleFromPassword(body.password || "");
      if (!role) {
        await db.recordLoginFailure(ip).catch((e) => console.error("로그인 실패 기록 실패:", e));
        return sendJson(res, 401, { error: "비밀번호가 올바르지 않습니다." });
      }
      return sendJson(res, 200, { ok: true, role });
    }

    if (pathname === "/api/health") return sendJson(res, 200, { ok: true });

    // GET /api/cron/daily-snapshot - Vercel Cron이 매일 자동으로 호출 (안전장치: 일일 백업 스냅샷)
    // Vercel이 CRON_SECRET 환경변수를 보고 Authorization: Bearer <값> 헤더를 자동으로 붙여서 호출해줌.
    if (pathname === "/api/cron/daily-snapshot" && method === "GET") {
      const expected = process.env.CRON_SECRET;
      const got = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
      if (!expected || got !== expected) return sendJson(res, 401, { error: "unauthorized" });
      await db.saveSnapshot("일일 자동 백업");
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/backup - 전체 데이터를 파일로 내려받기 (관리자 전용)
    if (pathname === "/api/backup" && method === "GET") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const backup = await db.getFullBackup();
      return sendJson(res, 200, backup);
    }

    // POST /api/restore - 백업 파일로 전체 데이터 덮어쓰기 (관리자 전용)
    if (pathname === "/api/restore" && method === "POST") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      if (!body || !Array.isArray(body.stores) || typeof body.storeData !== "object") {
        return sendJson(res, 400, { error: "올바른 백업 파일이 아닙니다." });
      }
      await db.restoreBackup(body);
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/snapshots - 자동 저장된 안전 스냅샷 목록 (관리자 전용)
    if (pathname === "/api/snapshots" && method === "GET") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const list = await db.listSnapshots();
      return sendJson(res, 200, list);
    }

    // /api/snapshots/:id, /api/snapshots/:id/restore
    const snapshotMatch = pathname.match(/^\/api\/snapshots\/(\d+)(\/restore)?$/);
    if (snapshotMatch) {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const id = Number(snapshotMatch[1]);
      const isRestore = !!snapshotMatch[2];

      if (!isRestore && method === "GET") {
        const snap = await db.getSnapshot(id);
        if (!snap) return sendJson(res, 404, { error: "스냅샷을 찾을 수 없습니다." });
        return sendJson(res, 200, snap);
      }

      if (isRestore && method === "POST") {
        const snap = await db.getSnapshot(id);
        if (!snap) return sendJson(res, 404, { error: "스냅샷을 찾을 수 없습니다." });
        // restoreBackup 자체가 실행 직전에 또 스냅샷을 남기므로, 이 복원도 안전하게 되돌릴 수 있다
        await db.restoreBackup(snap.data);
        return sendJson(res, 200, { ok: true });
      }
    }

    // GET /api/stores
    if (pathname === "/api/stores" && method === "GET") {
      const auth = checkAuth(req, "staff");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const stores = await db.listStores();
      return sendJson(res, 200, stores);
    }

    // POST /api/stores
    if (pathname === "/api/stores" && method === "POST") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      const name = (body.name || "").trim();
      const group = (body.group || "").trim();
      if (!name) return sendJson(res, 400, { error: "매장 이름을 입력하세요." });
      const id = "store_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const cfg = defaultStoreConfig();
      cfg.settings.storeName = name;
      await db.createStore(id, name, group, cfg);
      return sendJson(res, 200, { id, name, group });
    }

    // /api/stores/:id ...
    const storeMatch = pathname.match(/^\/api\/stores\/([^/]+)(\/(config|schedule|archive))?$/);
    if (storeMatch) {
      const id = decodeURIComponent(storeMatch[1]);
      const sub = storeMatch[3]; // undefined | 'config' | 'schedule' | 'archive'

      if (!sub && method === "PUT") {
        const auth = checkAuth(req, "admin");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        const found = await db.updateStoreMeta(id, body);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        return sendJson(res, 200, { ok: true });
      }

      if (!sub && method === "DELETE") {
        const auth = checkAuth(req, "admin");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        await db.deleteStore(id);
        return sendJson(res, 200, { ok: true });
      }

      if (sub && method === "GET") {
        const auth = checkAuth(req, "staff");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const { found, value } = await db.getStoreField(id, sub);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        if (sub === "config") return sendJson(res, 200, value || defaultStoreConfig());
        if (sub === "archive") return sendJson(res, 200, value || {});
        return sendJson(res, 200, value || null);
      }

      if (sub && method === "PUT") {
        const auth = checkAuth(req, "staff");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        const { found, updatedAt } = await db.putStoreField(id, sub, body);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        return sendJson(res, 200, { ok: true, updatedAt });
      }
    }

    // GET /api/stores/:id/meta - 마지막 수정 시각만 가볍게 조회 (다른 사람 수정 감지용 폴링)
    const metaMatch = pathname.match(/^\/api\/stores\/([^/]+)\/meta$/);
    if (metaMatch && method === "GET") {
      const auth = checkAuth(req, "staff");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const id = decodeURIComponent(metaMatch[1]);
      const meta = await db.getMeta(id);
      if (!meta) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
      return sendJson(res, 200, meta);
    }

    sendJson(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: "서버 오류: " + e.message });
  }
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") return send(res, 204, "");

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname, method);
  } else {
    serveStatic(req, res, pathname);
  }
}

module.exports = { handleRequest };
