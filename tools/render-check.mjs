/* ============================================================
   탭 렌더 검사 — 배포 전에 돌린다
   ------------------------------------------------------------
   `npm run build`는 통과하지만 그 탭을 열면 화면이 하얗게 비는 종류의 오류가 있다.
   실제로 두 번 났다.
     - lucide 아이콘을 import 하지 않고 쓴 경우
     - 다른 컴포넌트 안에 정의된 것을 밖에서 갖다 쓴 경우 (CodeOptions)
   둘 다 자바스크립트 문법은 멀쩡해서 빌드가 통과하고, 그 탭을 열 때만 죽는다.
   이 검사는 각 탭을 실제로 렌더해봐서 그런 것을 미리 잡는다.

   쓰는 법:  node tools/render-check.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const APP = path.join(REPO, "client/src/App.jsx");
const OUT = path.join(HERE, "_render_check_bundle.mjs");

// 탭 컴포넌트는 App.jsx 밖으로 export 되어 있지 않다.
// 원본은 건드리지 않고, 번들할 때만 export 한 줄을 덧붙인다.
const TABS = [
  "SettingsTab", "RestModeTab", "EmployeesTab", "PtContractsTab", "TagsTab",
  "HolidaysTab", "RequestsTab", "ShiftTemplatesTab", "ScheduleTab", "SummaryTab",
  "ArchiveTab", "LeaveTab", "ShiftyMapTab", "SupportMatchTab", "AuditTab", "InquiryTab",
];

const exportPlugin = {
  name: "export-tabs",
  setup(build) {
    build.onLoad({ filter: /App\.jsx$/ }, async (args) => {
      const code = await fs.promises.readFile(args.path, "utf8");
      const missing = TABS.filter((t) => !new RegExp("function\\s+" + t + "\\b").test(code));
      if (missing.length) {
        console.log("주의: App.jsx에서 찾지 못한 탭 — " + missing.join(", ") + " (이름이 바뀌었으면 TABS 목록도 고쳐주세요)");
      }
      const present = TABS.filter((t) => !missing.includes(t));
      return { contents: code + "\nexport { " + present.join(", ") + " };\n", loader: "jsx" };
    });
  },
};

await esbuild.build({
  entryPoints: [APP], bundle: true, format: "esm", platform: "node",
  outfile: OUT, plugins: [exportPlugin], logLevel: "silent", loader: { ".jsx": "jsx" },
  // 이것들은 번들에 넣지 않고 node가 직접 불러오게 한다.
  // react를 두 벌 넣으면 렌더가 깨지고, xlsx는 node의 require("stream")을 쓴다.
  external: ["react", "react-dom", "react-dom/server", "lucide-react", "xlsx"],
});

// 브라우저에만 있는 것들을 최소한으로 흉내낸다 (렌더 중에 건드릴 수 있어서)
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
globalThis.window ??= {
  localStorage: globalThis.localStorage,
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
globalThis.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {} }),
  body: { appendChild() {}, removeChild() {} },
};
globalThis.navigator ??= { userAgent: "node" };

const React = (await import("react")).default;
const { renderToString } = await import("react-dom/server");
let mod;
try {
  mod = await import(("file://" + OUT).replace(/\\/g, "/"));
} catch (e) {
  try { fs.unlinkSync(OUT); } catch {}
  console.log("X App.jsx를 불러오는 중 오류 — 화면 전체가 뜨지 않습니다:");
  console.log("  " + String(e.message).split("\n")[0]);
  process.exit(1);
}
const L = await import(("file://" + path.join(REPO, "client/src/logic.js")).replace(/\\/g, "/"));

// 화면은 "데이터가 없을 때"와 "있을 때"가 서로 다른 코드로 그려진다.
// 한 쪽만 검사하면 다른 쪽 오류를 놓치므로 두 가지 상태를 모두 만들어서 돌린다.
const storeList = [{ id: "s1", name: "검사용매장", group: "DS" }];
const noop = () => {};

function makeFixture(filled) {
  const data = L.defaultStoreData();
  const st = data.settings;
  const nx = L.nextMonth(st.year, st.startMonth);
  const monthsMeta = [
    { key: "m1", label: `${st.startMonth}월`, days: L.buildMonthDays(st.year, st.startMonth, data.holidays, data.issueDays) },
    { key: "m2", label: `${nx.month}월`, days: L.buildMonthDays(nx.year, nx.month, data.holidays, data.issueDays) },
  ];
  const schedule = { m1: {}, m2: {}, m1Memo: {}, m2Memo: {} };
  data.employees.forEach((e) => {
    schedule.m1[e.id] = Array(monthsMeta[0].days.length).fill("");
    schedule.m2[e.id] = Array(monthsMeta[1].days.length).fill("");
  });
  let archive = {};
  if (!filled) return { label: "빈 매장", data, schedule, archive, monthsMeta };

  const ft = data.employees.filter((e) => e.type === "정직원");
  const codes = (data.ftTemplates || []).map((t) => t.code).filter(Boolean);
  // 스케줄에 값 채우기 + 메모 줄
  data.employees.forEach((e, i) => {
    monthsMeta.forEach((m) => {
      schedule[m.key][e.id] = m.days.map((d, j) =>
        (j % 4 === 0 ? "휴무" : j % 7 === 0 ? "휴일" : codes[(i + j) % codes.length] || ""));
    });
  });
  data.memoRowLabels = [{ id: "memo1", label: "비고" }];
  monthsMeta.forEach((m) => { schedule[m.key + "Memo"] = { memo1: m.days.map(() => "") }; });

  // 인원 구성을 여러 가지로 (고정휴무 / 인턴(계약기간) / 지원근무 / 연속근무 미입력)
  if (ft[0]) { ft[0].restMode = "고정휴무"; }
  if (ft[1]) { ft[1].role = "인턴"; ft[1].contractStart = `${st.year}-0${st.startMonth}-01`; ft[1].contractEnd = `${st.year}-0${st.startMonth}-15`; }
  if (ft[2]) { ft[2].memberType = "지원근무"; ft[2].autoAssign = false; }
  if (ft[3]) { delete ft[3].consecRecommended; delete ft[3].consecMax; } // 미입력 경고 유발
  data.fixedRestSchedules = ft[0] ? [{
    start: `${st.year}-0${st.startMonth}-01`, end: `${st.year}-0${st.startMonth}-28`,
    dayPair: (data.dayPairOptions || L.DEFAULT_DAY_PAIR_OPTIONS)[0]?.label || "월화",
    empNames: [ft[0].name],
  }] : [];
  // 요청 · 사용 등록 · 발생 등록 · 연차 부여
  const reqTag = (data.tags || []).find((t) => t.convertToRest)?.code;
  data.personalTags = ft[0] && reqTag
    ? [{ empName: ft[0].name, tagCode: reqTag, start: monthsMeta[0].days[2].dateStr, end: monthsMeta[0].days[2].dateStr }] : [];
  const leaveTag = (data.tags || []).find((t) => t.trackAsLeave);
  data.usageRecords = ft[0] ? [{
    id: "u1", empId: ft[0].id, date: monthsMeta[0].days[5].dateStr, displayTag: "휴무",
    items: [{ pool: leaveTag?.leavePool || "연차", hours: 4, tag: leaveTag?.code || "" }], note: "검사용",
  }] : [];
  data.accrualLedger = ft[0] ? [{ id: "a1", empId: ft[0].id, pool: "시차", date: monthsMeta[0].days[1].dateStr, hours: 4, reason: "검사용" }] : [];
  data.annualLeaveGrants = ft[0] ? { [st.year]: { 연차: { [ft[0].id]: 15 } } } : {};
  // 월별기록.
  // [월별기록] 화면은 처음 열 때 "올해 · 이번 달"을 보여주므로, 그 달에도 기록을 넣어야
  // 표가 실제로 그려진다. 스케줄 달에만 넣으면 화면은 "기록 없음" 쪽만 그려서
  // 표를 그리는 코드의 오류를 놓친다.
  const entryFor = (days, label) => ({
    savedAt: new Date().toISOString(), label, days,
    employeesSnapshot: data.employees.map((e) => ({ id: e.id, name: e.name, type: e.type })),
    schedule: JSON.parse(JSON.stringify(schedule.m1)),
    memoRowLabels: [{ id: "memo1", label: "비고" }],
    memo: { memo1: days.map(() => "") },
  });
  archive = { [monthsMeta[0].days[0].dateStr.slice(0, 7)]: entryFor(monthsMeta[0].days, monthsMeta[0].label) };
  const now = new Date();
  const curYm = `${st.year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!archive[curYm]) {
    const curDays = L.buildMonthDays(st.year, now.getMonth() + 1, data.holidays, data.issueDays);
    archive[curYm] = entryFor(curDays, `${now.getMonth() + 1}월`);
  }
  return { label: "데이터 있는 매장", data, schedule, archive, monthsMeta };
}

function propsOf(fx) {
  const { data, schedule, archive, monthsMeta } = fx;
  return {
    SettingsTab: { data, setData: noop, role: "admin" },
    RestModeTab: { data, setData: noop, role: "admin" },
    EmployeesTab: { data, setData: noop, role: "admin" },
    PtContractsTab: { data, setData: noop, role: "admin" },
    TagsTab: { data, setData: noop, role: "admin", storeList, currentStoreId: "s1" },
    HolidaysTab: { data, setData: noop, role: "admin" },
    RequestsTab: { data, setData: noop, role: "admin" },
    ShiftTemplatesTab: { data, setData: noop, role: "admin" },
    ScheduleTab: { data, setData: noop, schedule, setSchedule: noop, archive, setArchive: noop, monthsMeta, monthKey: "m1", role: "admin" },
    SummaryTab: { data, schedule, monthsMeta },
    ArchiveTab: { data, archive, setArchive: noop, role: "admin" },
    LeaveTab: { data, setData: noop, archive, role: "admin" },
    ShiftyMapTab: { data, setData: noop, schedule, archive, monthsMeta, role: "admin", currentStoreId: "s1", storeList },
    SupportMatchTab: { storeList, currentStoreId: "s1" },
    AuditTab: { storeList, currentStoreId: "s1" },
    InquiryTab: { storeList, currentStoreId: "s1", role: "admin", storeName: data.settings.storeName },
  };
}

let fail = 0, ok = 0;
const problems = [];
for (const filled of [false, true]) {
  const fx = makeFixture(filled);
  const propsFor = propsOf(fx);
  // 2개월차 화면도 따로 그려본다(1개월차와 다른 계산을 탄다 - 이월분 등)
  for (const role of ["admin", "manager", "viewer"]) {
    for (const name of TABS) {
      const Comp = mod[name];
      if (!Comp) continue;
      const variants = name === "ScheduleTab" ? ["m1", "m2"] : [null];
      for (const mk of variants) {
        const props = { ...propsFor[name] };
        if ("role" in props) props.role = role;
        if (mk) props.monthKey = mk;
        try { renderToString(React.createElement(Comp, props)); ok++; }
        catch (e) {
          fail++;
          problems.push(`  X [${fx.label} · ${role}${mk ? " · " + mk : ""}] ${name}: ${String(e.message).split("\n")[0]}`);
        }
      }
    }
  }
}
try { fs.unlinkSync(OUT); } catch {}

if (problems.length) console.log(problems.join("\n"));
console.log(`탭 렌더 검사: 성공 ${ok}건 / 실패 ${fail}건 (빈 매장·데이터 있는 매장 × 역할 3가지)`);
if (fail === 0) {
  console.log("참고: 이 검사는 화면을 처음 그릴 때 나는 오류를 잡습니다.");
  console.log("      버튼을 눌러야 도는 코드까지는 확인하지 않습니다.");
}
process.exit(fail > 0 ? 1 : 0);
