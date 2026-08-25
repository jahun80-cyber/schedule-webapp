#!/usr/bin/env bash
# ============================================================
#  배포 전 검사 — 밀지 전에 이거 하나만 돌리면 된다
#    bash tools/predeploy.sh
#
#  하나라도 실패하면 종료코드 1로 끝난다.
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
step() { printf "\n\033[1m▶ %s\033[0m\n" "$1"; }

step "1/4  빌드"
if (cd client && npm run build 2>&1 | tail -3); then
  echo "  통과"
else
  echo "  X 빌드 실패"
  fail=1
fi

step "2/4  탭 렌더 검사 (빌드로는 안 잡히는 흰 화면 오류)"
if node tools/render-check.mjs; then
  :
else
  fail=1
fi

step "3/4  스케줄 배정 검사 (실제 계산이 규칙을 지키는지)"
if node tools/schedule-check.mjs; then
  :
else
  fail=1
fi

step "4/4  표 복사·붙여넣기 검사 (버튼을 눌러야 도는 코드라 렌더 검사가 못 봄)"
if node tools/paste-check.mjs; then
  :
else
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  printf "\n\033[32m전부 통과 — 배포해도 됩니다\033[0m\n"
else
  printf "\n\033[31m실패한 항목이 있습니다 — 배포하지 마세요\033[0m\n"
fi
exit "$fail"
