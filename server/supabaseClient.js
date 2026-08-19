// Supabase(Postgres) 연결 클라이언트. 서버에서만 사용하며, service_role 키를 씁니다.
// service_role 키는 RLS(Row Level Security)를 우회하는 관리자급 키이므로
// 절대 클라이언트(브라우저) 코드나 Git 저장소에 들어가면 안 됩니다. .env 파일에만 둡니다.
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn(
    "⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. .env 파일을 확인하세요. (Supabase 요청이 모두 실패합니다)"
  );
}

const supabase = createClient(url || "", key || "", {
  auth: { persistSession: false },
});

module.exports = { supabase };
