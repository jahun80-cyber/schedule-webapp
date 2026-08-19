// 로컬 개발 / Docker(Render)용 진입점. 실제 라우팅 로직은 server/app.js에 있고,
// 여기서는 .env 로딩 후 http 서버를 띄우는 역할만 합니다.
// (Vercel에서는 이 파일 대신 api/[[...path]].js가 쓰입니다 - Vercel은 자체적으로 환경변수를 주입해줍니다)
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

const { handleRequest } = require("./app");

const PORT = process.env.PORT || 4000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  const admin = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD;
  if (!admin && !staff) {
    console.log("⚠ ADMIN_PASSWORD / STAFF_PASSWORD 환경변수가 없어 누구나 관리자 권한으로 접속됩니다. (로컬 테스트용)");
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
  }
});
