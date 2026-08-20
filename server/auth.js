// 비밀번호 기반 인증. 사용자 계정 시스템 없이, 3단계 등급으로만 접근을 나눕니다.
//   - ADMIN_PASSWORD(총관리자):   매장 생성/삭제, 태그목록 수정, 백업/복원, 복구 스냅샷 등 전체 관리
//   - MANAGER_PASSWORD(매장관리자): 설정/직원목록/근무형태템플릿/공휴일·이슈일/스케줄 등 대부분 수정 가능
//                                    (단, 태그목록은 수정 불가 - 필요하면 총관리자에게 요청)
//   - STAFF_PASSWORD(사용자):     조회 전용 + 개인 지정 태그(요청휴무 등록)만 추가/삭제 가능
// 상위 등급은 하위 등급의 권한을 모두 포함합니다.
const ROLE_RANK = { viewer: 0, manager: 1, admin: 2 };

function getPasswords() {
  return {
    admin: process.env.ADMIN_PASSWORD || "",
    manager: process.env.MANAGER_PASSWORD || "",
    viewer: process.env.STAFF_PASSWORD || "",
  };
}

function roleFromPassword(pw) {
  const { admin, manager, viewer } = getPasswords();
  if (admin && pw === admin) return "admin";
  if (manager && pw === manager) return "manager";
  if (viewer && pw === viewer) return "viewer";
  // 셋 다 설정 안 했으면(로컬 테스트 등) 누구나 admin으로 취급
  if (!admin && !manager && !viewer) return "admin";
  return null;
}

// role이 requiredRole 이상의 등급인지 (상위 등급은 하위 권한을 모두 포함)
function hasRole(role, requiredRole) {
  const cur = ROLE_RANK[role];
  const need = ROLE_RANK[requiredRole];
  if (cur === undefined || need === undefined) return false;
  return cur >= need;
}

module.exports = { roleFromPassword, hasRole, ROLE_RANK };
