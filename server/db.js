// 저장소 계층. 이전에는 로컬 JSON 파일(server/data/db.json) 하나를 통째로 읽고 썼지만,
// 지금은 Supabase(Postgres) 테이블 두 개(stores, store_data)를 씁니다.
//   - stores:     매장 목록 (id, name, group)
//   - store_data: 매장별 데이터 (config, schedule, archive, updatedAt) — store당 1행
// 이 파일이 export하는 함수들은 server/app.js(라우트 핸들러)에서 그대로 가져다 씁니다.
// JS 쪽 필드명 "group"은 DB에서는 예약어 충돌을 피하려고 "store_group" 컬럼에 저장합니다.
const { supabase } = require("./supabaseClient");

function mapStoreRow(row) {
  return { id: row.id, name: row.name, group: row.store_group || "" };
}

async function listStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("id,name,store_group")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(mapStoreRow);
}

async function createStore(id, name, group, config) {
  const { error: storeErr } = await supabase
    .from("stores")
    .insert({ id, name, store_group: group || "" });
  if (storeErr) throw storeErr;

  const { error: dataErr } = await supabase
    .from("store_data")
    .insert({ store_id: id, config, schedule: null, archive: {}, updated_at: 0 });
  if (dataErr) throw dataErr;
}

async function updateStoreMeta(id, { name, group }) {
  const patch = {};
  if (name !== undefined && name !== "") patch.name = name;
  if (group !== undefined) patch.store_group = group;

  if (Object.keys(patch).length === 0) {
    const { data, error } = await supabase.from("stores").select("id").eq("id", id).maybeSingle();
    if (error) throw error;
    return !!data;
  }

  const { data, error } = await supabase.from("stores").update(patch).eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}

async function deleteStore(id) {
  // 삭제 직전 전체 스냅샷을 남겨둔다 (실수로 지워도 스냅샷에서 복구 가능)
  await saveSnapshot(`매장 삭제 직전 (id=${id})`).catch((e) => {
    console.error("삭제 전 스냅샷 저장 실패 (그래도 삭제는 계속 진행):", e);
  });
  // store_data는 FK ON DELETE CASCADE로 함께 삭제됩니다.
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) throw error;
}

async function getStoreField(id, field) {
  const { data, error } = await supabase
    .from("store_data")
    .select(field)
    .eq("store_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { found: false, value: null };
  return { found: true, value: data[field] };
}

async function putStoreField(id, field, value) {
  const updatedAt = Date.now();
  const { data, error } = await supabase
    .from("store_data")
    .update({ [field]: value, updated_at: updatedAt })
    .eq("store_id", id)
    .select("store_id");
  if (error) throw error;
  if (data.length === 0) return { found: false, updatedAt: null };
  return { found: true, updatedAt };
}

async function getMeta(id) {
  const { data, error } = await supabase
    .from("store_data")
    .select("updated_at")
    .eq("store_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { updatedAt: data.updated_at || 0 };
}

async function getFullBackup() {
  const [storesRes, dataRes] = await Promise.all([
    supabase.from("stores").select("id,name,store_group"),
    supabase.from("store_data").select("store_id,config,schedule,archive,updated_at"),
  ]);
  if (storesRes.error) throw storesRes.error;
  if (dataRes.error) throw dataRes.error;

  const storeData = {};
  for (const row of dataRes.data) {
    storeData[row.store_id] = {
      config: row.config,
      schedule: row.schedule,
      archive: row.archive,
      updatedAt: row.updated_at,
    };
  }
  return { stores: storesRes.data.map(mapStoreRow), storeData };
}

/* ============================================================
   안전장치: 파괴적인 작업(백업 복원 / 매장 삭제) 직전에
   현재 상태 전체를 backup_snapshots 테이블에 자동 저장해둔다.
   실수로 잘못된 백업을 복원하거나 매장을 잘못 지워도, 스냅샷 목록에서
   직전 상태를 그대로 다시 복원할 수 있다. (관리자 전용 API로 조회/복원)
   ============================================================ */
const MAX_SNAPSHOTS = 30; // 이보다 오래된 스냅샷은 자동으로 정리 (무한정 쌓이지 않도록)

async function saveSnapshot(reason) {
  const data = await getFullBackup();
  const { error } = await supabase.from("backup_snapshots").insert({ reason, data });
  if (error) throw error;
  await pruneSnapshots();
}

async function pruneSnapshots() {
  const { data, error } = await supabase
    .from("backup_snapshots")
    .select("id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const idsToDelete = (data || []).slice(MAX_SNAPSHOTS).map((r) => r.id);
  if (idsToDelete.length === 0) return;
  const { error: delErr } = await supabase.from("backup_snapshots").delete().in("id", idsToDelete);
  if (delErr) throw delErr;
}

async function listSnapshots() {
  // 목록에는 용량이 큰 data는 빼고 가볍게 (id/시각/사유만)
  const { data, error } = await supabase
    .from("backup_snapshots")
    .select("id,created_at,reason")
    .order("created_at", { ascending: false })
    .limit(MAX_SNAPSHOTS);
  if (error) throw error;
  return data;
}

async function getSnapshot(id) {
  const { data, error } = await supabase
    .from("backup_snapshots")
    .select("id,created_at,reason,data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function restoreBackup({ stores, storeData }) {
  // 기존 데이터를 전부 지우고 백업 내용으로 다시 채웁니다.
  // 실수로 잘못된 파일을 복원해도 되돌릴 수 있도록, 지우기 전에 지금 상태를 스냅샷으로 남겨둔다.
  await saveSnapshot("백업 복원 직전").catch((e) => {
    console.error("복원 전 스냅샷 저장 실패 (그래도 복원은 계속 진행):", e);
  });
  // (store_data는 stores 삭제 시 CASCADE로 함께 지워집니다)
  const { error: delError } = await supabase.from("stores").delete().not("id", "is", null);
  if (delError) throw delError;

  if (!stores || stores.length === 0) return;

  const storeRows = stores.map((s) => ({ id: s.id, name: s.name, store_group: s.group || "" }));
  const { error: insStoresErr } = await supabase.from("stores").insert(storeRows);
  if (insStoresErr) throw insStoresErr;

  const dataRows = stores.map((s) => {
    const entry = (storeData && storeData[s.id]) || {};
    return {
      store_id: s.id,
      config: entry.config || null,
      schedule: entry.schedule || null,
      archive: entry.archive || {},
      updated_at: entry.updatedAt || 0,
    };
  });
  const { error: insDataErr } = await supabase.from("store_data").insert(dataRows);
  if (insDataErr) throw insDataErr;
}

/* ============================================================
   안전장치: 로그인 무차별 대입(비밀번호 무한 시도) 방지
   같은 IP가 최근 15분 안에 실패를 LOGIN_FAIL_LIMIT번 넘게 하면 잠시 막는다.
   ============================================================ */
const LOGIN_FAIL_LIMIT = 8;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000; // 15분

async function checkLoginRateLimit(ip) {
  const since = new Date(Date.now() - LOGIN_FAIL_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("login_failures")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("attempted_at", since);
  if (error) throw error;
  return (count || 0) < LOGIN_FAIL_LIMIT;
}

async function recordLoginFailure(ip) {
  const { error } = await supabase.from("login_failures").insert({ ip });
  if (error) throw error;
  // 오래된 기록은 가끔 정리 (매번 할 필요는 없어 5% 확률로만 실행 - 비용 절감)
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("login_failures").delete().lt("attempted_at", cutoff);
  }
}


/* ============================================================
   감사로그: 누가(역할) 언제 어느 매장의 무엇을 고쳤는지 기록.
   설계 원칙 두 가지:
     1) 저장 실패해도 본 작업(설정/스케줄 저장)은 절대 막지 않는다 - 전부 try/catch로 삼킨다.
     2) 클라이언트가 0.6초마다 자동저장을 하기 때문에 그대로 남기면 표가 순식간에 폭발한다.
        그래서 "같은 매장 + 같은 역할 + 같은 작업"이 최근 COALESCE_WINDOW 안에 이미 있으면
        새 줄을 만들지 않고 건너뛴다(= 편집 한 묶음을 한 줄로 본다).
   ============================================================ */
const AUDIT_COALESCE_WINDOW_MS = 10 * 60 * 1000; // 10분
const AUDIT_RETENTION_DAYS = 180;

async function writeAudit({ storeId, storeName, role, action, detail, ip, coalesce = true }) {
  try {
    if (coalesce) {
      const since = new Date(Date.now() - AUDIT_COALESCE_WINDOW_MS).toISOString();
      let q = supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("role", role)
        .eq("action", action)
        .gte("created_at", since);
      q = storeId ? q.eq("store_id", storeId) : q.is("store_id", null);
      const { count, error } = await q;
      if (!error && (count || 0) > 0) return; // 최근에 같은 작업이 이미 기록됨 - 건너뜀
    }
    // supabase-js는 실패해도 예외를 던지지 않고 { error }를 돌려주므로, 직접 확인해서 남긴다.
    // (안 그러면 표가 없거나 권한이 막혀도 아무 흔적 없이 조용히 안 쌓여서 나중에 원인 찾기가 어렵다)
    const { error: insErr } = await supabase.from("audit_log").insert({
      store_id: storeId || null,
      store_name: storeName || null,
      role,
      action,
      detail: detail || null,
      ip: ip || null,
    });
    if (insErr) {
      console.error("감사로그 기록 실패 (본 작업에는 영향 없음):", insErr.message);
      return;
    }
    // 오래된 로그는 가끔만 정리 (매번 지우면 저장할 때마다 부담이 되므로 2% 확률로만)
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("audit_log").delete().lt("created_at", cutoff);
    }
  } catch (e) {
    console.error("감사로그 기록 실패 (본 작업에는 영향 없음):", e.message);
  }
}

async function listAudit({ storeId, limit = 200 } = {}) {
  let q = supabase
    .from("audit_log")
    .select("id,created_at,store_id,store_name,role,action,detail")
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(limit) || 200, 500));
  if (storeId) q = q.eq("store_id", storeId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}


/* ============================================================
   문의함: 매장이 올린 문의/건의와 답변.
   답변은 총관리자만 달 수 있고, 매장은 자기 매장 문의만 볼 수 있다(app.js에서 강제).
   ============================================================ */
async function createInquiry({ storeId, storeName, role, category, body }) {
  const { data, error } = await supabase
    .from("inquiries")
    .insert({ store_id: storeId || null, store_name: storeName || null, role, category: category || null, body })
    .select("id,created_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listInquiries({ storeId, status, limit = 200 } = {}) {
  let q = supabase
    .from("inquiries")
    .select("id,created_at,store_id,store_name,role,category,body,status,answer,answered_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(limit) || 200, 500));
  if (storeId) q = q.eq("store_id", storeId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// 미답변 건수만 가볍게 (사이드바 배지용 - 목록 전체를 받아오지 않는다)
async function countOpenInquiries(storeId) {
  let q = supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "open");
  if (storeId) q = q.eq("store_id", storeId);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function answerInquiry(id, { answer, status }) {
  const patch = {};
  if (answer !== undefined) { patch.answer = answer; patch.answered_at = new Date().toISOString(); }
  if (status) patch.status = status;
  else if (answer !== undefined) patch.status = "answered";
  const { data, error } = await supabase.from("inquiries").update(patch).eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}

// 삭제 권한을 확인하려면 그 문의가 어느 매장 것인지 먼저 알아야 한다
async function getInquiry(id) {
  const { data, error } = await supabase
    .from("inquiries")
    .select("id,store_id,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function deleteInquiry(id) {
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw error;
}

module.exports = {
  listStores,
  createStore,
  updateStoreMeta,
  deleteStore,
  getStoreField,
  putStoreField,
  getMeta,
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  checkLoginRateLimit,
  recordLoginFailure,
  getFullBackup,
  restoreBackup,
  writeAudit,
  listAudit,
  createInquiry,
  listInquiries,
  countOpenInquiries,
  answerInquiry,
  getInquiry,
  deleteInquiry,
};
