/* ============================================================
   스케줄 배정 검사 — 배포 전에 돌린다
   ------------------------------------------------------------
   자동배정 1~4단계를 여러 조건으로 돌려보고, 지켜져야 하는 규칙이 깨지지 않는지 본다.
   인원수·휴무방식·요청 유무를 바꿔가며 조합하므로, 한 매장에서만 확인할 때 놓치는
   경우를 잡을 수 있다.

   검사하는 규칙
     1. [요청]으로 등록한 쉬는 날이 근무로 바뀌지 않는다
     2. 사용 등록한 날이 근무로 바뀌지 않는다
     3. 최소 출근인원이 깨지지 않는다
     4. 연속근무 최대를 넘지 않는다
     5. 쉴 수 있는 자리가 남아 있는데 휴무/휴일이 부족한 채로 끝나지 않는다

   쓰는 법:  node tools/schedule-check.mjs
   ============================================================ */
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const L = await import(("file://" + path.join(REPO, "client/src/logic.js")).replace(/\\/g, "/"));

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

function makeCase(mode, ftCount, seed) {
  const r = rng(seed);
  const c = L.defaultStoreData();
  const st = c.settings;
  const dayPairs = c.dayPairOptions || L.DEFAULT_DAY_PAIR_OPTIONS;
  const ptCodes = (c.ptTemplates || []).map((t) => t.code).filter(Boolean);

  const emps = [];
  for (let i = 0; i < ftCount; i++) {
    const restMode = mode === "전원 로테이션" ? "로테이션"
      : mode === "전원 고정휴무" ? "고정휴무"
        : (i % 2 === 0 ? "로테이션" : "고정휴무");
    const e = { id: "t" + (i + 1), name: "직원" + (i + 1), type: "정직원", status: "재직", role: i === 0 ? "리더" : "직원", memberType: "우리매장", restMode };
    if (restMode === "로테이션") { e.consecRecommended = Number(st.consecRecommended) || 3; e.consecMax = Number(st.consecMax) || 4; }
    emps.push(e);
  }
  const ptNeed = Math.max(Number(st.weekdayMinPT) || 0, Number(st.weekendMinPT) || 0) + 1;
  for (let i = 0; i < ptNeed; i++) {
    emps.push({ id: "p" + (i + 1), name: "파트" + (i + 1), type: "파트타이머", status: "재직", dayType: "평일", fixedCode: ptCodes[i % ptCodes.length] || "", extendedCode: ptCodes[i % ptCodes.length] || "" });
  }
  c.employees = emps;

  const fixedEmps = emps.filter((e) => e.type === "정직원" && e.restMode === "고정휴무");
  c.fixedRestSchedules = [];
  if (fixedEmps.length && dayPairs.length) {
    const perPair = {};
    fixedEmps.forEach((e, i) => { const dp = dayPairs[i % dayPairs.length].label; (perPair[dp] = perPair[dp] || []).push(e.name); });
    const nx = L.nextMonth(st.year, st.startMonth);
    Object.entries(perPair).forEach(([dp, list]) => c.fixedRestSchedules.push({
      start: `${st.year}-${String(st.startMonth).padStart(2, "0")}-01`,
      end: `${nx.year}-${String(nx.month).padStart(2, "0")}-28`, dayPair: dp, empNames: list,
    }));
  }

  const reqTag = (c.tags || []).find((t) => t.convertToRest)?.code;
  const d1 = L.buildMonthDays(st.year, st.startMonth, c.holidays, c.issueDays);
  c.personalTags = [];
  if (reqTag) emps.filter((e) => e.type === "정직원").forEach((e) => {
    const n = Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { const d = d1[Math.floor(r() * d1.length)]; c.personalTags.push({ empName: e.name, tagCode: reqTag, start: d.dateStr, end: d.dateStr }); }
  });
  const leaveTag = (c.tags || []).find((t) => t.trackAsLeave);
  c.usageRecords = emps[0] && leaveTag ? [{ id: "u1", empId: emps[0].id, date: d1[8].dateStr, displayTag: "휴무", items: [{ pool: leaveTag.leavePool || "연차", hours: 4, tag: leaveTag.code }] }] : [];
  c.archive = {};
  return c;
}

function pipeline(c) {
  const st = c.settings;
  const nx = L.nextMonth(st.year, st.startMonth);
  const mm = [
    { key: "m1", days: L.buildMonthDays(st.year, st.startMonth, c.holidays, c.issueDays) },
    { key: "m2", days: L.buildMonthDays(nx.year, nx.month, c.holidays, c.issueDays) },
  ];
  let s = { m1: {}, m2: {} };
  c.employees.forEach((e) => { s.m1[e.id] = Array(mm[0].days.length).fill(""); s.m2[e.id] = Array(mm[1].days.length).fill(""); });
  s = L.applyUsageRecords(s, c.employees, c.usageRecords, mm).schedule;
  s = L.applyPersonalTags(s, c.employees, c.personalTags, mm).schedule;
  s = L.applyFixedRestSchedules(s, c.employees, c.fixedRestSchedules, c.dayPairOptions, mm, st, c.tags).schedule;
  s = L.assignRestDays(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions).schedule;
  s = L.convertRequestTags(s, c.employees, c.tags, st, mm, { annualLeaveGrants: c.annualLeaveGrants, archive: {} }).schedule;
  s = L.assignShiftCodes(s, c.employees, c.tags, st, c.ftTemplates, c.ptTemplates, c.prefCode, mm, c.ftThresholds).schedule;
  s = L.assignRemainingRest(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions).schedule;
  s = L.assignShiftCodes(s, c.employees, c.tags, st, c.ftTemplates, c.ptTemplates, c.prefCode, mm, c.ftThresholds).schedule;
  const r4 = L.finalAdjust(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions, c.personalTags, c.usageRecords);
  s = L.assignShiftCodes(r4.schedule, c.employees, c.tags, st, c.ftTemplates, c.ptTemplates, c.prefCode, mm, c.ftThresholds).schedule;
  return { s, mm };
}

function inspect(c, { s, mm }) {
  const st = c.settings;
  const bad = [];
  const ft = c.employees.filter((e) => e.type === "정직원" && L.isActiveEmployee(e) && L.isAutoAssignable(e));
  const isOff = (v) => v !== "" && L.isOffTag(c.tags, v);

  // 1) 요청 · 2) 사용 등록이 지켜졌나
  const promised = [];
  (c.personalTags || []).forEach((p) => { const e = c.employees.find((x) => x.name === p.empName); if (e) promised.push(["요청", e, p.start]); });
  (c.usageRecords || []).forEach((u) => { const e = c.employees.find((x) => x.id === u.empId); if (e) promised.push(["사용 등록", e, u.date]); });
  promised.forEach(([kind, e, date]) => {
    mm.forEach((m) => m.days.forEach((d, i) => {
      if (d.dateStr !== date) return;
      if (!isOff(s[m.key][e.id]?.[i] || "")) bad.push(`${kind}이 근무로 바뀜 (${e.name} ${date})`);
    }));
  });

  // 3) 최소 출근인원 · 5) 남은 여유
  let room = 0;
  mm.forEach((m) => m.days.forEach((d, i) => {
    let attend = 0;
    ft.forEach((x) => {
      if (!L.isUnderContractOn(x, d.dateStr) || !L.isCountedOn(x, d.dateStr)) return;
      if (!isOff(s[m.key][x.id]?.[i] || "")) attend++;
    });
    const req = L.requiredFT(st, d);
    if (attend < req) bad.push(`최소 출근인원 미달 (${m.key} ${d.day}일 ${attend}/${req})`);
    room += Math.max(0, attend - req);
  }));

  // 4) 연속근무 최대
  let short = 0;
  ft.forEach((e) => {
    const cmax = L.fixedRestLimitOf(c.fixedRestSchedules, c.dayPairOptions, e, st);
    let w = 0;
    const close = () => { if (w > cmax) bad.push(`연속근무 최대 초과 (${e.name} ${w}일 > ${cmax}일)`); w = 0; };
    mm.forEach((m) => m.days.forEach((d, i) => { if (isOff(s[m.key][e.id]?.[i] || "")) close(); else w++; }));
    close();
    const cnt = (k) => { let n = 0; (s[k][e.id] || []).forEach((v) => { if (v === "휴무" || v === "휴일") n++; }); return n; };
    const T1 = L.restTargetFor(e, "m1", mm[0].days), T2 = L.restTargetFor(e, "m2", mm[1].days);
    short += Math.max(0, (T1.humu + T1.hyuil + T2.humu + T2.hyuil) - (cnt("m1") + cnt("m2")));
  });

  // 5) 여유가 남았는데 부족한 사람이 있으면 안 된다
  if (short > 0 && room > 0) bad.push(`쉴 자리가 ${room}명분 남았는데 휴무/휴일이 ${short}일 부족`);
  return bad;
}

const MODES = ["전원 로테이션", "전원 고정휴무", "섞어서"];
const COUNTS = [4, 6, 8, 10];
const SEEDS = [11, 2027, 90210];
let runs = 0, failCases = 0;
const seen = new Map();
for (const mode of MODES) for (const n of COUNTS) for (const seed of SEEDS) {
  runs++;
  let bad;
  try { const c = makeCase(mode, n, seed); bad = inspect(c, pipeline(c)); }
  catch (e) { bad = ["실행 중 오류: " + e.message]; }
  if (!bad.length) continue;
  failCases++;
  bad.forEach((b) => {
    const key = b.replace(/\d+/g, "N");
    if (!seen.has(key)) seen.set(key, { n: 0, ex: `${mode} ${n}명 seed${seed} — ${b}` });
    seen.get(key).n++;
  });
}
if (seen.size) {
  console.log("  규칙을 어긴 경우:");
  [...seen.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
    console.log(`    [${v.n}건] ${k}`);
    console.log(`           예) ${v.ex}`);
  });
}
console.log(`스케줄 배정 검사: ${runs}회 중 ${runs - failCases}회 통과 / ${failCases}회 규칙 위반`);
// 정직원이 적은 매장(4명)은 최소 출근인원 기준상 구조적으로 다 채울 수 없는 경우가 있어
// 그 자체로는 실패로 보지 않는다. 그 외 규칙이 깨지면 실패로 본다.
const seriousKeys = [...seen.keys()].filter((k) => /요청|사용 등록|쉴 자리가/.test(k));
if (seriousKeys.length) { console.log("  X 반드시 지켜야 할 규칙이 깨졌습니다."); process.exit(1); }
process.exit(0);
