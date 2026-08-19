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

async function restoreBackup({ stores, storeData }) {
  // 기존 데이터를 전부 지우고 백업 내용으로 다시 채웁니다.
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

module.exports = {
  listStores,
  createStore,
  updateStoreMeta,
  deleteStore,
  getStoreField,
  putStoreField,
  getMeta,
  getFullBackup,
  restoreBackup,
};
