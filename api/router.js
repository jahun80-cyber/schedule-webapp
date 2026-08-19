// Vercel 서버리스 함수 진입점. 파일명 기반 동적 라우팅([...path].js 등)이
// outputDirectory를 직접 지정한 이 프로젝트 구성에서는 안정적으로 동작하지 않아,
// 대신 이 파일은 평범한 고정 경로(/api/router)로 두고 vercel.json의 rewrites 규칙으로
// /api/* 요청 전부를 이 함수로 명시적으로 보냅니다.
// 실제 처리 로직은 server/app.js를 그대로 재사용합니다 - 로컬 서버와 동일 코드, 중복 없음.
const { handleRequest } = require("../server/app");

module.exports = (req, res) => handleRequest(req, res);
