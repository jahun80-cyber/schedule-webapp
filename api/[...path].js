// Vercel 서버리스 함수 진입점. /api/ 로 시작하는 모든 요청(하위 경로 포함)이 여기로 들어옵니다.
// (파일명의 [...path]는 Vercel의 표준 catch-all 라우트 문법입니다 - /api/최소 한 단계 이상의 경로를 모두 잡음.
//  참고: [[...path]] 같은 "optional catch-all"은 Next.js 전용 문법이라 일반 Vercel 함수에서는 지원되지 않습니다.)
// 실제 처리 로직은 server/app.js를 그대로 재사용합니다 - 로컬 서버와 동일 코드, 중복 없음.
const { handleRequest } = require("../server/app");

module.exports = (req, res) => handleRequest(req, res);
