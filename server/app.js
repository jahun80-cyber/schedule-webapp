// 실제 요청 라우팅 로직. 로컬 개발 서버(server/index.js)와 Vercel 서버리스 함수(api/[[...path]].js)가
// 이 파일의 handleRequest(req, res)를 그대로 가져다 씁니다 - 로직 중복 없음.
const fs = require("fs");
const path = require("path");

const db = require("./db");
const { roleFromPassword, hasRole } = require("./auth");
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
  if (!hasRole(role, requiredRole)) {
    return { ok: false, status: 403, error: "이 작업을 수행할 권한이 없습니다." };
  }
  return { ok: true, role };
}


/* ---------- 감사로그용: config의 어떤 부분이 바뀌었는지 사람이 읽을 이름으로 알아낸다 ---------- */
// 화면 이름과 맞춰둬야 나중에 로그만 보고 "어느 화면에서 손댄 건지" 바로 알 수 있다.
const CONFIG_SECTION_LABELS = {
  settings: "설정",
  employees: "직원목록",
  tags: "태그목록",
  holidays: "공휴일",
  issueDays: "이슈일",
  personalTags: "요청",
  ftTemplates: "근무형태템플릿(정직원)",
  ptTemplates: "근무형태템플릿(파트)",
  ftThresholds: "근무형태 인원기준",
  shiftyCodeMap: "시프티 코드변환표",
  fixedRestSchedules: "고정휴무 설정",
  dayPairOptions: "요일쌍 목록",
  annualLeaveGrants: "연차 보유량",
  memoRowLabels: "메모 줄",
  prefCode: "선호 근무코드",
};

function diffConfigSections(before, after) {
  if (!before) return ["전체(최초 저장)"];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const k of keys) {
    // JSON 문자열 비교 - config는 순수 데이터(JSONB)라 이 방식으로 충분하고 빠르다
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      changed.push(CONFIG_SECTION_LABELS[k] || k);
    }
  }
  return changed;
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
      await db.writeAudit({ role: auth.role, action: "backup.restore", detail: "백업 복원(전체 매장 덮어쓰기)", ip: getClientIp(req), coalesce: false });
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
    /* ---------- 문의함 ----------
       - 목록/등록: 매장관리자 이상. 단 총관리자가 아니면 storeId를 반드시 지정해야 하고
         그 매장 것만 볼 수 있다(다른 매장 문의를 훔쳐보지 못하게 서버에서 강제).
       - 답변/삭제: 총관리자만. */
    if (pathname === "/api/inquiries" && method === "GET") {
      const auth = checkAuth(req, "manager");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const q = new URL(req.url, "http://localhost").searchParams;
      let storeId = q.get("storeId") || "";
      if (auth.role !== "admin") {
        if (!storeId) return sendJson(res, 400, { error: "매장을 지정해야 합니다." });
      }
      const rows = await db.listInquiries({ storeId, status: q.get("status") || "", limit: q.get("limit") || "200" });
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/inquiries/open-count" && method === "GET") {
      const auth = checkAuth(req, "manager");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const q = new URL(req.url, "http://localhost").searchParams;
      const storeId = auth.role === "admin" ? (q.get("storeId") || "") : (q.get("storeId") || "");
      if (auth.role !== "admin" && !storeId) return sendJson(res, 200, { count: 0 });
      return sendJson(res, 200, { count: await db.countOpenInquiries(storeId) });
    }

    if (pathname === "/api/inquiries" && method === "POST") {
      const auth = checkAuth(req, "manager");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      const text = String(body.body || "").trim();
      if (!text) return sendJson(res, 400, { error: "문의 내용을 입력하세요." });
      if (text.length > 5000) return sendJson(res, 400, { error: "문의 내용이 너무 깁니다(5000자 이내)." });
      const row = await db.createInquiry({
        storeId: body.storeId || null, storeName: body.storeName || null,
        role: auth.role, category: body.category || null, body: text,
      });
      await db.writeAudit({
        storeId: body.storeId, storeName: body.storeName, role: auth.role,
        action: "inquiry.create", detail: "문의 등록", ip: getClientIp(req), coalesce: false,
      });
      return sendJson(res, 200, row || { ok: true });
    }

    const inqMatch = pathname.match(/^\/api\/inquiries\/(\d+)$/);
    if (inqMatch && method === "DELETE") {
      // 삭제는 총관리자 전용. 매장은 삭제 대신 "숨기기"(status=closed)를 쓴다 -
      // 나중에 다시 찾아볼 수 있어야 하므로 내용을 지우지 않는다.
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const id = Number(inqMatch[1]);
      const inq = await db.getInquiry(id);
      if (!inq) return sendJson(res, 404, { error: "문의를 찾을 수 없습니다." });
      await db.deleteInquiry(id);
      await db.writeAudit({
        storeId: inq.store_id, role: auth.role, action: "inquiry.delete",
        detail: `문의 삭제 (#${id})`, ip: getClientIp(req), coalesce: false,
      });
      return sendJson(res, 200, { ok: true });
    }

    if (inqMatch && method === "PUT") {
      // 총관리자: 답변 작성/수정 + 상태 변경 모두 가능
      // 매장관리자: 자기 매장 글의 "숨기기(closed) / 다시 표시(answered)"만 가능 (답변은 못 씀)
      const auth = checkAuth(req, "manager");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      const id = Number(inqMatch[1]);
      const body = await readBody(req);
      const inq = await db.getInquiry(id);
      if (!inq) return sendJson(res, 404, { error: "문의를 찾을 수 없습니다." });

      if (auth.role !== "admin") {
        const claimed = String(body.storeId || "");
        if (!claimed || !inq.store_id || inq.store_id !== claimed) {
          return sendJson(res, 403, { error: "다른 매장의 문의는 변경할 수 없습니다." });
        }
        if (body.answer !== undefined) {
          return sendJson(res, 403, { error: "답변은 총관리자만 등록할 수 있습니다." });
        }
        if (body.status !== "closed" && body.status !== "answered") {
          return sendJson(res, 400, { error: "숨기기/다시 표시만 가능합니다." });
        }
        // 아직 답변이 달리지 않은 문의는 숨길 수 없다(답변을 못 받고 묻히는 걸 막기 위해)
        if (body.status === "closed" && inq.status === "open") {
          return sendJson(res, 400, { error: "아직 답변되지 않은 문의는 숨길 수 없습니다." });
        }
        await db.answerInquiry(id, { status: body.status });
        await db.writeAudit({
          storeId: inq.store_id, role: auth.role, action: "inquiry.hide",
          detail: `문의 ${body.status === "closed" ? "숨김" : "다시 표시"} (#${id})`,
          ip: getClientIp(req), coalesce: false,
        });
        return sendJson(res, 200, { ok: true });
      }

      const found = await db.answerInquiry(id, { answer: body.answer, status: body.status });
      if (!found) return sendJson(res, 404, { error: "문의를 찾을 수 없습니다." });
      await db.writeAudit({
        storeId: inq.store_id, role: auth.role, action: "inquiry.answer",
        detail: `문의 답변 (#${id})`, ip: getClientIp(req), coalesce: false,
      });
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/audit?storeId=&limit=  - 감사로그 조회 (총관리자 전용)
    if (pathname === "/api/audit" && method === "GET") {
      const auth = checkAuth(req, "admin");
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      // handleApi에는 pathname/method만 넘어오므로 쿼리스트링은 여기서 직접 파싱한다
      const q = new URL(req.url, "http://localhost").searchParams;
      const storeId = q.get("storeId") || "";
      const limit = q.get("limit") || "200";
      const rows = await db.listAudit({ storeId, limit });
      return sendJson(res, 200, rows);
    }

    if (pathname === "/api/stores" && method === "GET") {
      const auth = checkAuth(req, "viewer");
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
      await db.writeAudit({ storeId: id, storeName: name, role: auth.role, action: "store.create", detail: `매장 생성 (${name})`, ip: getClientIp(req), coalesce: false });
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
        await db.writeAudit({ storeId: id, storeName: body?.name, role: auth.role, action: "store.rename", detail: `매장명/채널 변경 (${body?.name || ""})`, ip: getClientIp(req), coalesce: false });
        return sendJson(res, 200, { ok: true });
      }

      if (!sub && method === "DELETE") {
        const auth = checkAuth(req, "admin");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        await db.deleteStore(id);
        await db.writeAudit({ storeId: id, role: auth.role, action: "store.delete", detail: "매장 삭제", ip: getClientIp(req), coalesce: false });
        return sendJson(res, 200, { ok: true });
      }

      if (sub && method === "GET") {
        const auth = checkAuth(req, "viewer");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const { found, value } = await db.getStoreField(id, sub);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        if (sub === "config") return sendJson(res, 200, value || defaultStoreConfig());
        if (sub === "archive") return sendJson(res, 200, value || {});
        return sendJson(res, 200, value || null);
      }

      // PUT .../config - 역할별로 실제 저장되는 필드가 다르다.
      //   admin:   보낸 config를 그대로 저장
      //   manager: 보낸 config를 그대로 저장 (태그목록도 매장마다 근무조가 달라 직접 고쳐야 한다)
      //   viewer:  personalTags만 반영, 나머지는 전부 기존 값 유지 - 개인 지정 태그(요청휴무)만 허용
      // 클라이언트 화면이 <fieldset disabled>로 입력을 막아두더라도, 여기서 서버가 한 번 더 강제한다.
      if (sub === "config" && method === "PUT") {
        const auth = checkAuth(req, "viewer");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        const { found: curFound, value: current } = await db.getStoreField(id, "config");
        if (!curFound) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });

        let toSave = body;
        if (auth.role === "viewer") {
          toSave = { ...(current || {}), personalTags: body.personalTags };
        }

        const { found, updatedAt } = await db.putStoreField(id, "config", toSave);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        // 감사로그: config는 저장 전 값(current)을 이미 읽어뒀으므로 추가 조회 없이 바뀐 항목을 알아낼 수 있다.
        const changed = diffConfigSections(current, toSave);
        if (changed.length > 0) {
          await db.writeAudit({
            storeId: id, storeName: toSave?.settings?.storeName, role: auth.role,
            action: "config.update", detail: changed.join(", "), ip: getClientIp(req),
          });
        }
        return sendJson(res, 200, { ok: true, updatedAt });
      }

      // PUT .../schedule, .../archive - 매장관리자 이상만 가능
      if (sub && method === "PUT") {
        const auth = checkAuth(req, "manager");
        if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
        const body = await readBody(req);
        const { found, updatedAt } = await db.putStoreField(id, sub, body);
        if (!found) return sendJson(res, 404, { error: "매장을 찾을 수 없습니다." });
        await db.writeAudit({
          storeId: id, role: auth.role,
          action: sub === "schedule" ? "schedule.update" : "archive.update",
          detail: sub === "schedule" ? "스케줄" : "월별기록",
          ip: getClientIp(req),
        });
        return sendJson(res, 200, { ok: true, updatedAt });
      }
    }

    // GET /api/stores/:id/meta - 마지막 수정 시각만 가볍게 조회 (다른 사람 수정 감지용 폴링)
    const metaMatch = pathname.match(/^\/api\/stores\/([^/]+)\/meta$/);
    if (metaMatch && method === "GET") {
      const auth = checkAuth(req, "viewer");
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
