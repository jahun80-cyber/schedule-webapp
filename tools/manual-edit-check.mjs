/* ============================================================
   수기 수정이 다음 단계에서 살아남는지 검사
   ------------------------------------------------------------
   1~4단계를 버튼으로 나눠둔 이유는 단계마다 사람이 손으로 고칠 틈을 주기 위해서다.
   그런데 뒤 단계가 앞서 고친 것을 덮어쓰면 그 의도가 깨진다.
   실매장 설정 + 가상 인원으로 1·2단계까지 돌린 뒤 네 가지 수정을 넣고,
   2(재실행)·3·4단계를 차례로 돌리며 각 수정이 남아 있는지 센다.

   수정하지 않은 비교군을 나란히 돌려서, 값이 달라진 것이
   "내 수정이 무시된 것"인지 "원래 그 값이 되는 것"인지 구분한다.

   쓰는 법:  AUDIT_DATA=<config 폴더> node tools/manual-edit-check.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DATA = process.env.AUDIT_DATA;
if (!DATA) { console.log("AUDIT_DATA 폴더를 지정해주세요 (cfg_<id>.json, store_ids.txt가 든 폴더)"); process.exit(1); }
const L = await import(pathToFileURL(path.join(REPO, "client/src/logic.js")).href);

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
  c.personalTags = []; c.usageRecords = []; c.archive = {};
  void r;
  return c;
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const run2 = (c, st, mm, s) => L.assignShiftCodes(s, c.employees, c.tags, st, c.ftTemplates, c.ptTemplates, c.prefCode, mm, c.ftThresholds).schedule;
const run3 = (c, st, mm, s) => {
  const r = L.assignRemainingRest(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions);
  return r.changedDayCount > 0 ? run2(c, st, mm, r.schedule) : r.schedule;
};
const run4 = (c, st, mm, s) => {
  const r = L.finalAdjust(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions, c.personalTags, c.usageRecords);
  return r.changedDayCount > 0 ? run2(c, st, mm, r.schedule) : r.schedule;
};

const KINDS = ["① 근무조 바꾸기", "② 휴무를 휴일로", "③ 근무일을 휴무로", "④ 휴일을 근무로"];
const STAGES = ["2단계 재실행", "3단계", "4단계"];
// tally[종류][단계] = { kept, overwritten, other, sideKept, n }
//  kept     : 넣은 값 그대로
//  sideKept : 값은 달라졌지만 "쉬는 날 / 근무일"이라는 방향은 지켜짐
//             (예: 휴무로 바꿔둔 칸이 휴일이 되었다 - 쉬는 것은 그대로다)
const tally = KINDS.map(() => STAGES.map(() => ({ kept: 0, overwritten: 0, other: 0, sideKept: 0, n: 0 })));
let runs = 0, skipped = 0, crash = 0;

const names = {};
fs.readFileSync(path.join(DATA, "store_ids.txt"), "utf8").trim().split("\n").forEach((l) => { const [a, b] = l.split("|"); names[a] = b; });

for (const [id, nm] of Object.entries(names)) {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(path.join(DATA, "cfg_" + id + ".json"), "utf8")); } catch { continue; }
  if (!cfg?.settings) continue;
  const base0 = Math.max(Number(cfg.settings.weekdayMinFT) || 0, Number(cfg.settings.weekendMinFT) || 0);
  for (const mode of ["로테이션", "고정휴무", "섞어서"]) {
    for (const extra of [2, 4]) {
      const n = base0 + extra;
      if (n < 3) continue;
      try {
        const c = build(cfg, mode, n, 4242 + n * 7);
        const st = c.settings, nx = L.nextMonth(st.year, st.startMonth);
        const mm = [{ key: "m1", days: L.buildMonthDays(st.year, st.startMonth, c.holidays, c.issueDays) },
                    { key: "m2", days: L.buildMonthDays(nx.year, nx.month, c.holidays, c.issueDays) }];
        let s = { m1: {}, m2: {} };
        c.employees.forEach((e) => { s.m1[e.id] = Array(mm[0].days.length).fill(""); s.m2[e.id] = Array(mm[1].days.length).fill(""); });
        s = L.applyFixedRestSchedules(s, c.employees, c.fixedRestSchedules, c.dayPairOptions, mm, st, c.tags).schedule;
        s = L.assignRestDays(s, c.employees, c.tags, st, mm, c.fixedRestSchedules, c.dayPairOptions).schedule;
        s = run2(c, st, mm, s);   // 사람이 손대기 시작하는 시점 = 1·2단계까지 끝난 상태

        const ft = c.employees.filter((e) => e.type === "정직원" && L.isActiveEmployee(e) && L.isAutoAssignable(e));
        const wcodes = (c.ftTemplates || []).map((t) => t.code).filter(Boolean);
        if (ft.length < 5 || wcodes.length < 2) { skipped++; continue; }

        // 사람마다 다른 자리를 하나씩 고른다(서로 간섭하지 않게)
        const pick = (pred, empIdx) => {
          const e = ft[empIdx % ft.length];
          const arr = s.m1[e.id] || [];
          for (let i = 3; i < arr.length - 3; i++) if (pred(arr[i])) return { e, i, before: arr[i] };
          return null;
        };
        const spots = [
          pick((v) => wcodes.includes(v), 1),
          pick((v) => v === "휴무", 2),
          pick((v) => wcodes.includes(v), 3),
          pick((v) => v === "휴일", 4),
        ];
        if (spots.some((x) => !x)) { skipped++; continue; }
        spots[0].to = wcodes.find((x) => x !== spots[0].before) || wcodes[0];
        spots[1].to = "휴일";
        spots[2].to = "휴무";
        spots[3].to = wcodes[0];

        const edited0 = clone(s);
        spots.forEach((sp) => { edited0.m1[sp.e.id][sp.i] = sp.to; });
        let E = edited0, C = clone(s);
        [run2, run3, run4].forEach((fn, si) => {
          E = fn(c, st, mm, E);
          C = fn(c, st, mm, C);
          spots.forEach((sp, ki) => {
            const now = E.m1[sp.e.id][sp.i];
            const ctrl = C.m1[sp.e.id][sp.i];
            const t = tally[ki][si];
            t.n++;
            if (now === sp.to) { t.kept++; t.sideKept++; return; }
            // 값은 달라졌어도 쉬는 날/근무일이라는 방향이 같으면 뜻은 지켜진 것으로 본다
            const wantOff = L.isOffTag(c.tags, sp.to);
            const nowOff = now !== "" && L.isOffTag(c.tags, now);
            if (now !== "" && wantOff === nowOff) t.sideKept++;
            if (now === ctrl) t.overwritten++;
            else t.other++;
          });
        });
        runs++;
      } catch (err) { crash++; }
    }
  }
}

const pct = (a, b) => b === 0 ? "-" : (Math.round(a / b * 1000) / 10).toFixed(1) + "%";
const padk = (v, n) => { const w = String(v).replace(/[^\x00-\x7F]/g, "..").length; return String(v) + " ".repeat(Math.max(1, n - w)); };

console.log(`수기 수정 보존 검사: 조합 ${runs}회 (건너뜀 ${skipped}, 크래시 ${crash})\n`);
console.log("칸에 넣은 값 그대로 남은 비율 / 쉬는날·근무일이라는 뜻이 지켜진 비율\n");
console.log(padk("고친 것", 22) + STAGES.map((s0) => padk(s0, 22)).join(""));
KINDS.forEach((k, ki) => {
  console.log(padk(k, 22) + STAGES.map((_, si) => {
    const t = tally[ki][si];
    return padk(`${pct(t.kept, t.n)} / 뜻 ${pct(t.sideKept, t.n)}`, 22);
  }).join(""));
});
console.log("\n되돌아간 경우의 내역 (남지 않은 것 중)");
KINDS.forEach((k, ki) => {
  const parts = STAGES.map((s0, si) => {
    const t = tally[ki][si];
    const lost = t.n - t.kept;
    if (lost === 0) return `${s0}: 없음`;
    return `${s0}: ${lost}건(원래값으로 ${t.overwritten}, 제3의 값 ${t.other})`;
  });
  console.log("  " + k + " — " + parts.join(" / "));
});
