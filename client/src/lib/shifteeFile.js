// 시프티(Shiftee) 업로드용 엑셀 파일을 읽고, 우리 시스템의 스케줄 값을 변환해서 채워 넣는 로직.
// UI(App.jsx)와 분리해둬서, Node 스크립트로도 실제 파일에 대고 검증할 수 있게 한다.
import * as XLSX from "xlsx";

// "2026-09-01~2026-10-31" 같은 문자열에서 시작일/종료일을 뽑아낸다.
export function parsePeriod(periodStr) {
  const m = String(periodStr || "").match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

// 로컬 타임존(KST 등)으로 파싱하면 toISOString()에서 UTC로 변환되며 날짜가 하루 밀릴 수 있어,
// 항상 UTC 기준으로만 계산한다.
function toUTCDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateDiffDays(a, b) {
  return Math.round((toUTCDate(b) - toUTCDate(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = toUTCDate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// aoa(시트 전체를 배열의 배열로 읽은 것)에서 헤더행 / 첫 날짜열 / 직원 데이터 행 범위를 찾는다.
// 실제 시프티 업로드 양식 기준: "사원번호" 헤더행 -> 요일행 -> 일자행 -> 직원 데이터 행들 -> "근무일정 템플릿" 표
export function findLayout(aoa) {
  let headerRow = -1;
  for (let r = 0; r < aoa.length; r++) {
    if (aoa[r][0] === "사원번호") { headerRow = r; break; }
  }
  if (headerRow === -1) {
    throw new Error('업로드 양식을 인식할 수 없습니다 ("사원번호" 헤더를 찾지 못했습니다).');
  }
  const firstDateCol = aoa[headerRow].indexOf("직무들") + 1;
  if (firstDateCol <= 0) {
    throw new Error('업로드 양식을 인식할 수 없습니다 ("직무들" 헤더를 찾지 못했습니다).');
  }

  const empRows = [];
  for (let r = headerRow + 3; r < aoa.length; r++) {
    const a = String(aoa[r][0] || "").trim();
    const b = String(aoa[r][1] || "").trim();
    if (!a && !b) break;
    if (a === "근무일정 템플릿") break;
    empRows.push({ row: r, empNo: a, name: b });
  }

  const periodStr = String(aoa[0]?.[1] || "");
  const period = parsePeriod(periodStr);

  return { headerRow, firstDateCol, empRows, period };
}

/**
 * 워크북을 실제로 채운다.
 * @param wb   XLSX.read()로 읽은 워크북
 * @param employees  [{id, name, empNo}] - 우리 시스템 직원 목록
 * @param getOurCode (empId, dateStr) => "A" | "휴무" | "" 등 - 그 직원의 그 날짜 우리 코드
 * @param convertCode (ourCode) => "007FA" 등 - 코드 변환표 적용 결과 (매핑 없으면 원래 코드 그대로 반환됨)
 * @returns { filledCount, matchedEmployees, unmatchedRows, period }
 */
export function fillWorkbook(wb, { employees, getOurCode, convertCode }) {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const { empRows, firstDateCol, period } = findLayout(aoa);
  if (!period) throw new Error('파일에서 "기간" 값을 읽지 못했습니다.');

  const byEmpNo = new Map();
  const byName = new Map();
  employees.forEach((e) => {
    if (e.empNo && String(e.empNo).trim()) byEmpNo.set(String(e.empNo).trim(), e);
    if (e.name && e.name.trim()) byName.set(e.name.trim(), e);
  });

  const totalDays = dateDiffDays(period.start, period.end) + 1;
  let filledCount = 0;
  const matchedEmployees = [];
  const unmatchedRows = [];

  empRows.forEach(({ row, empNo, name }) => {
    const emp = (empNo && byEmpNo.get(empNo)) || byName.get(name);
    if (!emp) { unmatchedRows.push({ empNo, name }); return; }
    matchedEmployees.push({ empNo, name, id: emp.id });

    for (let i = 0; i < totalDays; i++) {
      const dateStr = addDays(period.start, i);
      const ourCode = getOurCode(emp.id, dateStr);
      if (!ourCode) continue;
      const shiftyCode = convertCode(ourCode);
      if (!shiftyCode) continue;
      const col = firstDateCol + i;
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      ws[addr] = { t: "s", v: shiftyCode };
      filledCount++;
    }
  });

  return { filledCount, matchedEmployees, unmatchedRows, period };
}

export function workbookToArrayBuffer(wb) {
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

export function readWorkbook(arrayBuffer) {
  return XLSX.read(arrayBuffer, { type: "array" });
}

// 원본 파일명 뒤에 "-변환완료"를 붙인다 (원본은 건드리지 않고 새 파일로 저장하기 위함).
export function outputFileName(originalName) {
  const m = originalName.match(/^(.*)\.xlsx$/i);
  const base = m ? m[1] : originalName;
  return `${base}-변환완료.xlsx`;
}
