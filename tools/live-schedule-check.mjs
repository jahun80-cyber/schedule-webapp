/* ============================================================
   실매장 설정으로 하는 배정 검사 (선택 도구)
   ------------------------------------------------------------
   35개 매장 각각의 실제 설정(요일구분·최소인원·근무형태템플릿·태그)에
   가상의 인원과 가상의 요청을 넣고 1~4단계를 돌려 규칙 위반을 찾는다.
   인원수는 그 매장의 최소 출근인원을 기준으로 정하고, 애초에 불가능한 조합은 건너뛴다.

   쓰는 법:  AUDIT_DATA=<config 폴더> node tools/live-schedule-check.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DATA = process.env.AUDIT_DATA;
const L = await import(("file://" + path.join(REPO, "client/src/logic.js")).replace(/\\/g, "/"));

function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

function build(cfg, mode, ftCount, seed) {
  const r = rng(seed);
  const c = JSON.parse(JSON.stringify(cfg));
  const st = c.settings;
  const dayPairs = c.dayPairOptions || L.DEFAULT_DAY_PAIR_OPTIONS;
  const ptCodes = (c.ptTemplates || []).map((t) => t.code).filter(Boolean);
  const emps = [];
  for (let i = 0; i < ftCount; i++) {
    const restMode = mode === "로테이션" ? "로테이션" : mode === "고정휴무" ? "고정휴무" : (i % 2 ? "고정휴무" : "로테이션");
    const e = { id: "t" + i, name: "직원" + (i + 1), type: "정직원", status: "재직", role: i === 0 ? "리더" : "직원", memberType: "우리매장", restMode };
    if (restMode === "로테이션") { e.consecRecommended = Number(st.consecRecommended) || 3; e.consecMax = Number(st.consecMax) || 4; }
    // 인원 중 하나는 계약이 중간에 끝나게 (실제로 있는 상황)
    if (i === ftCount - 1 && ftCount > 4) {
      e.contractStart = `${st.year}-${String(st.startMonth).padStart(2, "0")}-01`;
      e.contractEnd = `${st.year}-${String(st.startMonth).padStart(2, "0")}-18`;
    }
    emps.push(e);
  }
  const ptNeed = Math.max(Number(st.weekdayMinPT) || 0, Number(st.weekendMinPT) || 0) + 1;
  for (let i = 0; i < ptNeed; i++) emps.push({ id: "p" + i, name: "파트" + (i + 1), type: "파트타이머", status: "재직", dayType: "평일", fixedCode: ptCodes[i % ptCodes.length] || "", extendedCode: ptCodes[i % ptCodes.length] || "" });
  c.employees = emps;

  const fixedEmps = emps.filter((e) => e.type === "정직원" && e.restMode === "고정휴무");
  c.fixedRestSchedules = [];
  if (fixedEmps.length && dayPairs.length) {
    const per = {};
    fixedEmps.forEach((e, i) => { const dp = dayPairs[i % dayPairs.length].label; (per[dp] = per[dp] || []).push(e.name); });
    const nx = L.nextMonth(st.year, st.startMonth);
    Object.entries(per).forEach(([dp, list]) => c.fixedRestSchedules.push({
      start: `${st.year}-${String(st.startMonth).padStart(2, "0")}-01`,
      end: `${nx.year}-${String(nx.month).padStart(2, "0")}-28`, dayPair: dp, empNames: list }));
  }
  const reqTag = (c.tags || []).find((t) => t.convertToRest)?.code;
  const d1 = L.buildMonthDays(st.year, st.startMonth, c.holidays, c.issueDays);
  c.personalTags = [];
  if (reqTag) emps.filter((e) => e.type === "정직원").forEach((e) => {
    const n = Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { const d = d1[Math.floor(r() * d1.length)]; c.personalTags.push({ empNames: [e.name], tagCode: reqTag, start: d.dateStr, end: d.dateStr }); }
  });
  const lt = (c.tags || []).find((t) => t.trackAsLeave);
  c.usageRecords = lt ? [{ id: "u1", empId: emps[0].id, date: d1[9].dateStr, displayTag: "휴무", items: [{ pool: lt.leavePool || "연차", hours: 4, tag: lt.code }] }] : [];
  c.archive = {};
  return c;
}

function run(c) {
  const st = c.settings;
  const nx = L.nextMonth(st.year, st.startMonth);
  const mm = [{ key: "m1", days: L.buildMonthDays(st.year, st.startMonth, c.holidays, c.issueDays) },
              { key: "m2", days: L.buildMonthDays(nx.year, nx.month, c.holidays, c.issueDays) }];
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
  const st = c.settings, bad = [];
  const ft = c.employees.filter((e) => e.type === "정직원" && L.isActiveEmployee(e) && L.isAutoAssignable(e));
  const isOff = (v) => v !== "" && L.isOffTag(c.tags, v);
  (c.personalTags || []).forEach((p) => {
    const nm = (p.empNames || [p.empName])[0];
    const e = c.employees.find((x) => x.name === nm); if (!e) return;
    mm.forEach((m) => m.days.forEach((d, i) => { if (d.dateStr === p.start && !isOff(s[m.key][e.id]?.[i] || "")) bad.push("요청이 근무로 바뀜"); }));
  });
  (c.usageRecords || []).forEach((u) => {
    const e = c.employees.find((x) => x.id === u.empId); if (!e) return;
    mm.forEach((m) => m.days.forEach((d, i) => { if (d.dateStr === u.date && !isOff(s[m.key][e.id]?.[i] || "")) bad.push("사용 등록이 근무로 바뀜"); }));
  });
  let room = 0, short = 0;
  mm.forEach((m) => m.days.forEach((d, i) => {
    let at = 0;
    ft.forEach((x) => { if (!L.isUnderContractOn(x, d.dateStr) || !L.isCountedOn(x, d.dateStr)) return; if (!isOff(s[m.key][x.id]?.[i] || "")) at++; });
    const req = L.requiredFT(st, d);
    if (at < req) bad.push("최소 출근인원 미달");
    room += Math.max(0, at - req);
  }));
  ft.forEach((e) => {
    const cmax = L.fixedRestLimitOf(c.fixedRestSchedules, c.dayPairOptions, e, st);
    let w = 0; const close = () => { if (w > cmax) bad.push("연속근무 최대 초과"); w = 0; };
    mm.forEach((m) => m.days.forEach((d, i) => {
      // 계약기간 밖인 날은 근무가 아니므로 연속근무가 끊긴 것으로 본다
      if (!L.isUnderContractOn(e, d.dateStr)) { close(); return; }
      if (isOff(s[m.key][e.id]?.[i] || "")) close(); else w++;
    })); close();
    const cnt = (k) => { let n = 0; (s[k][e.id] || []).forEach((v) => { if (v === "휴무" || v === "휴일") n++; }); return n; };
    const T1 = L.restTargetFor(e, "m1", mm[0].days), T2 = L.restTargetFor(e, "m2", mm[1].days);
    short += Math.max(0, (T1.humu + T1.hyuil + T2.humu + T2.hyuil) - (cnt("m1") + cnt("m2")));
  });
  if (short > 0 && room > 0) bad.push("쉴 자리가 남았는데 휴무/휴일 부족");
  return bad;
}

const names = {};
fs.readFileSync(path.join(DATA, "store_ids.txt"), "utf8").trim().split("\n").forEach((l) => { const [a, b] = l.split("|"); names[a] = b; });
const tally = new Map();
let runs = 0, clean = 0, crash = 0, skipped = 0;
for (const [id, nm] of Object.entries(names)) {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(path.join(DATA, "cfg_" + id + ".json"), "utf8")); } catch { continue; }
  if (!cfg || cfg.error || !cfg.settings || !cfg.tags) continue;
  // 그 매장이 요구하는 최소 출근인원보다 적은 인원을 넣으면 어떤 방식으로도 미달이라
  // 검사가 되지 않는다. 최소인원을 기준으로 "빠듯 / 보통 / 넉넉" 세 가지를 만든다.
  const need = Math.max(Number(cfg.settings.weekdayMinFT) || 0, Number(cfg.settings.weekendMinFT) || 0);
  const counts = [...new Set([need + 1, need + 3, need + 6, Math.max(4, need + 1)])].filter((x) => x >= 2);
  for (const mode of ["로테이션", "고정휴무", "섞어서"]) for (const n of counts) for (const seed of [7, 4242]) {
    // 애초에 불가능한 조건은 검사 대상이 아니다.
    // (그 기간에 쉴 수 있는 자리 총합이 필요한 쉬는 날 총합보다 적으면 어떤 방식으로도 못 채운다)
    {
      const stx = cfg.settings;
      const nxx = L.nextMonth(stx.year, stx.startMonth);
      const dd = [...L.buildMonthDays(stx.year, stx.startMonth, cfg.holidays, cfg.issueDays),
                  ...L.buildMonthDays(nxx.year, nxx.month, cfg.holidays, cfg.issueDays)];
      let slots = 0, needRest = 0;
      dd.forEach((d) => { slots += Math.max(0, n - L.requiredFT(stx, d)); });
      const t1 = L.satTarget(L.buildMonthDays(stx.year, stx.startMonth, cfg.holidays, cfg.issueDays)) + L.sunHolTarget(L.buildMonthDays(stx.year, stx.startMonth, cfg.holidays, cfg.issueDays));
      const t2 = L.satTarget(L.buildMonthDays(nxx.year, nxx.month, cfg.holidays, cfg.issueDays)) + L.sunHolTarget(L.buildMonthDays(nxx.year, nxx.month, cfg.holidays, cfg.issueDays));
      needRest = n * (t1 + t2);
      if (slots < needRest) { skipped++; continue; }
    }
    runs++;
    let bad;
    try { const c = build(cfg, mode, n, seed); bad = inspect(c, run(c)); }
    catch (e) { crash++; bad = ["실행 중 오류: " + String(e.message).split("\n")[0]]; }
    if (!bad.length) { clean++; continue; }
    [...new Set(bad)].forEach((b) => {
      if (!tally.has(b)) tally.set(b, { n: 0, where: new Set() });
      tally.get(b).n++; tally.get(b).where.add(`${nm}(${mode} ${n}명)`);
    });
  }
}
console.log("규칙 위반 유형:");
if (!tally.size) console.log("  없음");
[...tally.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
  const w = [...v.where];
  console.log(`  [${v.n}회] ${k}`);
  console.log(`         ${w.slice(0, 3).join(", ")}${w.length > 3 ? ` 외 ${w.length - 3}` : ""}`);
});
console.log(`\n전 매장 가상 검사: ${runs}회 중 ${clean}회 무결 (${((clean / runs) * 100).toFixed(1)}%) · 실행 중단 ${crash}회`);
