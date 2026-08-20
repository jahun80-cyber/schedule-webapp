// 다운로드 폴더 연결(File System Access API) 핸들을 "이 브라우저"에 영구 저장한다.
// 우리 서버/DB와는 무관하다 - 컴퓨터·브라우저마다 따로 저장되므로, 컴퓨터 3대에서 쓰면
// 각 컴퓨터에서 한 번씩 연결해두면 된다 (매장별로 관리하는 게 아니라 기기별로 관리됨).
const DB_NAME = "schedule-webapp-fs";
const STORE_NAME = "handles";
const KEY = "downloadsDir";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirHandle() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDirHandle() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// 이미 허용받은 폴더면 창 없이 조용히 통과되고, 처음이거나 취소했었다면 다시 물어본다.
export async function ensurePermission(handle, mode = "readwrite") {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if ((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}
