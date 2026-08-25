/* ============================================================
   스케줄 표 복사·붙여넣기 검사
   ------------------------------------------------------------
   붙여넣기는 버튼(Ctrl+V)을 눌러야 도는 코드라 렌더 검사로는 확인되지 않는다.
   그래서 "어느 칸에 무엇이 들어가는지"를 정하는 planPasteCells에 값을 직접 넣어
   범위 자르기·반복 채우기·표 밖으로 넘지 않기가 맞는지 확인한다.

   쓰는 법:  node tools/paste-check.mjs
   ============================================================ */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const L = await import(pathToFileURL(path.join(REPO, "client/src/logic.js")).href);

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++;
  console.log(`  실패: ${name}`);
  console.log(`     기대: ${w}`);
  console.log(`     실제: ${g}`);
};

// 결과를 "행별 값 배열"로 눌러서 비교하기 쉽게 만든다
const grid = (res, rect) => {
  const rows = {};
  res.cells.forEach(({ r, c, value }) => { (rows[r] = rows[r] || {})[c] = value; });
  return Object.keys(rows).sort((a, b) => a - b).map((r) =>
    Object.keys(rows[r]).sort((a, b) => a - b).map((c) => rows[r][c]));
};

const one = (r, c) => ({ rMin: r, rMax: r, cMin: c, cMax: c });
const box = (r1, c1, r2, c2) => ({ rMin: r1, rMax: r2, cMin: c1, cMax: c2 });

/* --- 1) 한 칸만 고르고 붙여넣기: 복사한 크기 그대로 들어가야 한다 --- */
check("한 칸 선택 + 2행3열 붙여넣기",
  grid(L.planPasteCells("A\tB\tC\n휴무\t휴일\tA", one(0, 0), 10, 10)),
  [["A", "B", "C"], ["휴무", "휴일", "A"]]);

check("한 칸 선택 + 한 칸 붙여넣기",
  grid(L.planPasteCells("휴무", one(3, 5), 10, 10)),
  [["휴무"]]);

/* --- 2) 넓게 고르고 붙여넣기: 고른 범위를 채울 때까지 반복 --- */
check("2행 복사 -> 4행 선택에 반복",
  grid(L.planPasteCells("A\n휴무", box(0, 0, 3, 0), 10, 10)),
  [["A"], ["휴무"], ["A"], ["휴무"]]);

check("1행2열 복사 -> 1행5열 선택에 반복",
  grid(L.planPasteCells("A\t휴무", box(0, 0, 0, 4), 10, 10)),
  [["A", "휴무", "A", "휴무", "A"]]);

check("고른 범위가 복사한 것보다 작으면 잘린다",
  grid(L.planPasteCells("A\tB\tC\tD", box(0, 0, 0, 1), 10, 10)),
  [["A", "B"]]);

/* --- 3) 표 밖으로 넘지 않는다 --- */
check("행이 표 끝을 넘으면 잘린다",
  grid(L.planPasteCells("A\nB\nC\nD", one(2, 0), 4, 10)),
  [["A"], ["B"]]);

check("열이 표 끝을 넘으면 잘린다",
  grid(L.planPasteCells("A\tB\tC\tD", one(0, 28), 10, 31)),
  [["A", "B", "C"]]);

/* --- 4) 글자 형식 --- */
check("빈칸(연속 탭)도 값으로 들어간다",
  grid(L.planPasteCells("A\t\t휴무", one(0, 0), 10, 10)),
  [["A", "", "휴무"]]);

check("줄 끝 공백과 CRLF를 정리한다",
  grid(L.planPasteCells("A \t 휴무\r\n B\t휴일 \r\n", one(0, 0), 10, 10)),
  [["A", "휴무"], ["B", "휴일"]]);

check("맨 끝 빈 줄은 무시한다",
  grid(L.planPasteCells("A\n휴무\n\n", one(0, 0), 10, 10)),
  [["A"], ["휴무"]]);

check("줄마다 열 수가 다르면 없는 칸은 빈칸",
  grid(L.planPasteCells("A\tB\n휴무", one(0, 0), 10, 10)),
  [["A", "B"], ["휴무", ""]]);

/* --- 5) 아무것도 하지 않아야 하는 경우 --- */
check("빈 글자", L.planPasteCells("", one(0, 0), 10, 10).cells.length, 0);
check("선택 없음", L.planPasteCells("A", null, 10, 10).cells.length, 0);
check("표가 비어 있음", L.planPasteCells("A", one(0, 0), 0, 0).cells.length, 0);

/* --- 6) 복사 쪽 형식 확인 (엑셀과 주고받을 수 있어야 한다) --- */
{
  // 화면이 만드는 글자와 같은 방식으로 만들어, 다시 붙여넣었을 때 원래대로 돌아오는지 본다
  const original = [["A", "휴무", ""], ["C", "", "휴일"]];
  const text = original.map((row) => row.join("\t")).join("\n");
  check("복사 -> 붙여넣기 왕복", grid(L.planPasteCells(text, one(0, 0), 10, 10)), original);
}

console.log(`붙여넣기 검사: 통과 ${pass}건 / 실패 ${fail}건`);
process.exit(fail > 0 ? 1 : 0);
