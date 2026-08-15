// 아주 단순한 파일 기반 저장소. 별도 DB 서버 없이 JSON 파일 하나로 모든 데이터를 관리합니다.
// 배포 환경에 영구 디스크(Persistent Disk/Volume)를 연결하면 재배포해도 데이터가 유지됩니다.
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ stores: [], storeData: {} }, null, 2));
  }
}
ensureDb();

let writeQueue = Promise.resolve();

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { stores: [], storeData: {} };
  }
}

// 쓰기는 큐에 넣어서 동시 요청이 몰려도 파일이 깨지지 않게 함
function writeDb(mutatorFn) {
  writeQueue = writeQueue.then(() => {
    const db = readDb();
    const result = mutatorFn(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  return writeQueue;
}

module.exports = { readDb, writeDb, DB_FILE };
