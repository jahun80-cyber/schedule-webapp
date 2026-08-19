// Vercel 서버리스 함수 진입점. /api 로 시작하는 모든 요청이 여기로 들어옵니다.
// (파일명의 [[...path]]는 "optional catch-all" 라우트라, /api 자체와 /api/아무경로 를 모두 잡습니다)
// 실제 처리 로직은 server/app.js를 그대로 재사용합니다 - 로컬 서버와 동일 코드, 중복 없음.
const { handleRequest } = require("../server/app");

module.exports = (req, res) => handleRequest(req, res);
