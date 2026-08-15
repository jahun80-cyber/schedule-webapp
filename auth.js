// 아주 단순한 비밀번호 기반 인증. 사용자 계정 시스템 없이,
// "관리자 비밀번호"와 "직원(매장) 비밀번호" 두 단계로만 접근을 나눕니다.
//   - ADMIN_PASSWORD: 매장 생성/삭제/이름변경 등 관리 작업 가능
//   - STAFF_PASSWORD: 매장 데이터 조회/수정만 가능 (매장 생성/삭제 불가)
// 관리자 비밀번호는 직원 권한도 함께 가집니다.

function getPasswords() {
  return {
    admin: process.env.ADMIN_PASSWORD || "",
    staff: process.env.STAFF_PASSWORD || "",
  };
}

function roleFromPassword(pw) {
  const { admin, staff } = getPasswords();
  if (admin && pw === admin) return "admin";
  if (staff && pw === staff) return "staff";
  // 둘 다 설정 안 했으면(로컬 테스트 등) 누구나 admin으로 취급
  if (!admin && !staff) return "admin";
  return null;
}

function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const pw = req.header("x-app-password") || "";
    const role = roleFromPassword(pw);
    if (!role) return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    if (requiredRole === "admin" && role !== "admin") {
      return res.status(403).json({ error: "관리자만 할 수 있는 작업입니다." });
    }
    req.role = role;
    next();
  };
}

module.exports = { authMiddleware, roleFromPassword };
