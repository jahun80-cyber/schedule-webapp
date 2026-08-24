/* ============================================================
   실매장 데이터로 하는 화면 검사 (선택 도구)
   ------------------------------------------------------------
   tools/render-check.mjs 는 기본 데이터로 돌지만, 이건 실제 35개 매장 데이터로 돈다.
   매장마다 설정과 데이터 모양이 달라서 특정 매장에서만 나는 오류를 잡을 수 있다.

   쓰는 법:
     1) 매장 config/archive/schedule 을 폴더에 받아둔다
        (cfg_<id>.json, arc_<id>.json, sch_<id>.json, store_ids.txt)
     2) AUDIT_DATA=<그 폴더> node tools/live-render-check.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const APP = path.join(REPO, "client/src/App.jsx");
const OUT = path.join(HERE, "_live_render_bundle.mjs");
const DATA = process.env.AUDIT_DATA;

const TABS = [
  "SettingsTab", "RestModeTab", "EmployeesTab", "PtContractsTab", "TagsTab",
  "HolidaysTab", "RequestsTab", "ShiftTemplatesTab", "ScheduleTab", "SummaryTab",
  "ArchiveTab", "LeaveTab", "ShiftyMapTab", "SupportMatchTab", "AuditTab", "InquiryTab",
];

await esbuild.build({
  entryPoints: [APP], bundle: true, format: "esm", platform: "node", outfile: OUT,
  logLevel: "silent", loader: { ".jsx": "jsx" },
  external: ["react", "react-dom", "react-dom/server", "lucide-react", "xlsx"],
  plugins: [{
    name: "x", setup(b) {
      b.onLoad({ filter: /App\.jsx$/ }, async (a) => {
        const code = await fs.promises.readFile(a.path, "utf8");
        return { contents: code + "\nexport { " + TABS.join(", ") + " };\n", loader: "jsx" };
      });
    },
  }],
});

const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window ??= { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.document ??= { addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }), body: { appendChild() {}, removeChild() {} } };
globalThis.navigator ??= { userAgent: "node" };

const React = (await import("react")).default;
const { renderToString } = await import("react-dom/server");
const mod = await import(("file://" + OUT).replace(/\\/g, "/"));
const L = await import(("file://" + path.join(REPO, "client/src/logic.js")).replace(/\\/g, "/"));

const names = {};
fs.readFileSync(path.join(DATA, "store_ids.txt"), "utf8").trim().split("\n").forEach((l) => { const [a, b] = l.split("|"); names[a] = b; });
const storeList = Object.entries(names).map(([id, n]) => ({ id, name: n, group: "DS" }));
const noop = () => {};

let ok = 0, fail = 0;
const problems = new Map();
for (const [id, nm] of Object.entries(names)) {
  let data, archive, schedule;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DATA, "cfg_" + id + ".json"), "utf8"));
    archive = JSON.parse(fs.readFileSync(path.join(DATA, "arc_" + id + ".json"), "utf8")) || {};
    schedule = JSON.parse(fs.readFileSync(path.join(DATA, "sch_" + id + ".json"), "utf8"));
  } catch { continue; }
  if (!data || data.error || !data.settings) continue;
  const st = data.settings;
  const nx = L.nextMonth(st.year, st.startMonth);
  const monthsMeta = [
    { key: "m1", label: `${st.startMonth}월`, days: L.buildMonthDays(st.year, st.startMonth, data.holidays, data.issueDays) },
    { key: "m2", label: `${nx.month}월`, days: L.buildMonthDays(nx.year, nx.month, data.holidays, data.issueDays) },
  ];
  if (!schedule || !schedule.m1) {
    schedule = { m1: {}, m2: {}, m1Memo: {}, m2Memo: {} };
    (data.employees || []).forEach((e) => { schedule.m1[e.id] = Array(monthsMeta[0].days.length).fill(""); schedule.m2[e.id] = Array(monthsMeta[1].days.length).fill(""); });
  }
  const P = {
    SettingsTab: { data, setData: noop, role: "admin" },
    RestModeTab: { data, setData: noop, role: "admin" },
    EmployeesTab: { data, setData: noop, role: "admin" },
    PtContractsTab: { data, setData: noop, role: "admin" },
    TagsTab: { data, setData: noop, role: "admin", storeList, currentStoreId: id },
    HolidaysTab: { data, setData: noop, role: "admin" },
    RequestsTab: { data, setData: noop, role: "admin" },
    ShiftTemplatesTab: { data, setData: noop, role: "admin" },
    ScheduleTab: { data, setData: noop, schedule, setSchedule: noop, archive, setArchive: noop, monthsMeta, monthKey: "m1", role: "admin" },
    SummaryTab: { data, schedule, monthsMeta },
    ArchiveTab: { data, archive, setArchive: noop, role: "admin" },
    LeaveTab: { data, setData: noop, archive, role: "admin" },
    ShiftyMapTab: { data, setData: noop, schedule, archive, monthsMeta, role: "admin", currentStoreId: id, storeList },
    SupportMatchTab: { storeList, currentStoreId: id },
    AuditTab: { storeList, currentStoreId: id },
    InquiryTab: { storeList, currentStoreId: id, role: "admin", storeName: st.storeName },
  };
  for (const role of ["admin", "manager", "viewer"]) {
    for (const name of TABS) {
      const Comp = mod[name];
      if (!Comp) continue;
      const variants = name === "ScheduleTab" ? ["m1", "m2"] : [null];
      for (const mk of variants) {
        const props = { ...P[name] };
        if ("role" in props) props.role = role;
        if (mk) props.monthKey = mk;
        try { renderToString(React.createElement(Comp, props)); ok++; }
        catch (e) {
          fail++;
          const key = `${name} [${role}] ${String(e.message).split("\n")[0]}`;
          if (!problems.has(key)) problems.set(key, []);
          problems.get(key).push(nm);
        }
      }
    }
  }
}
try { fs.unlinkSync(OUT); } catch {}
if (problems.size) {
  console.log("문제:");
  [...problems.entries()].forEach(([k, v]) => console.log(`  X ${k}\n      매장 ${v.length}곳: ${v.slice(0, 4).join(", ")}${v.length > 4 ? " 외" : ""}`));
}
console.log(`\n실매장 렌더: 성공 ${ok}건 / 실패 ${fail}건`);
