const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const DOW_OPTIONS = ["평일", "주말", "평일(소프트-주말수준)"];

const DEFAULT_TAGS = [
  { id: "tag_default_1", code: "A", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { id: "tag_default_2", code: "B", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { id: "tag_default_3", code: "C", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { id: "tag_default_4", code: "A/F", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { id: "tag_default_5", code: "B/F", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { id: "tag_default_6", code: "휴무", category: "확정휴무", countsAsAttend: false, restType: "휴무", desc: "주 1회 필수 휴무" },
  { id: "tag_default_7", code: "휴일", category: "확정휴무", countsAsAttend: false, restType: "휴일", desc: "휴무 다음으로 배정되는 휴식일" },
  { id: "tag_default_8", code: "연차", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "개인 연차", trackAsLeave: true, leaveHours: 8, leavePool: "연차" },
  { id: "tag_default_9", code: "반차(오전)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오전 반차", trackAsLeave: true, leaveHours: 4, leavePool: "연차" },
  { id: "tag_default_10", code: "반차(오후)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오후 반차", trackAsLeave: true, leaveHours: 4, leavePool: "연차", countsAsShift: "A" },
  { id: "tag_default_11", code: "반반차", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "반반차", trackAsLeave: true, leaveHours: 2, leavePool: "연차", countsAsShift: "A" },
  { id: "tag_default_12", code: "경조사", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "경조사 휴가" },
  { id: "tag_default_13", code: "예비군", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "예비군 훈련" },
  { id: "tag_default_14", code: "지원근무", category: "확정근무", countsAsAttend: false, restType: "해당없음", desc: "타매장 지원 (본 매장 인원에서 제외)" },
  { id: "tag_default_15", code: "교육", category: "확정근무", countsAsAttend: true, restType: "해당없음", desc: "사내 교육" },
  { id: "tag_default_16", code: "PT입사", category: "확정근무", countsAsAttend: true, restType: "해당없음", desc: "신규 PT 입사/교육" },
  { id: "tag_default_17", code: "민방위", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "민방위 훈련" },
  { id: "tag_default_18", code: "RQ", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "개인 요청 휴무" },
];

const DEFAULT_EMPLOYEES = [
  { id: "e1", name: "이재훈", type: "정직원", status: "재직" },
  { id: "e2", name: "하윤수", type: "정직원", status: "재직" },
  { id: "e3", name: "강미성", type: "정직원", status: "재직" },
  { id: "e4", name: "송나현", type: "정직원", status: "재직" },
  { id: "e5", name: "박승민", type: "파트타이머", fixedCode: "D(8)", extendedCode: "E(8)", dayType: "평일", status: "재직" },
  { id: "e6", name: "김현준", type: "파트타이머", fixedCode: "A(6)", extendedCode: "", dayType: "평일", status: "재직" },
  { id: "e7", name: "임예빈", type: "파트타이머", fixedCode: "A(6)", extendedCode: "", dayType: "주말", status: "재직" },
  { id: "e8", name: "이주현", type: "파트타이머", fixedCode: "E(8)", extendedCode: "", dayType: "주말", status: "재직" },
  { id: "e9", name: "이채은", type: "파트타이머", fixedCode: "A(6)", extendedCode: "", dayType: "평일", status: "재직" },
];

const DEFAULT_HOLIDAYS = [
  { date: "2026-01-01", name: "신정" }, { date: "2026-02-16", name: "설날" },
  { date: "2026-02-17", name: "설날" }, { date: "2026-02-18", name: "설날" },
  { date: "2026-03-01", name: "삼일절" }, { date: "2026-03-02", name: "대체휴일" },
  { date: "2026-05-01", name: "노동절" }, { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-24", name: "석가탄신일" }, { date: "2026-05-25", name: "대체휴일" },
  { date: "2026-06-06", name: "현충일" }, { date: "2026-07-17", name: "제헌절" },
  { date: "2026-08-15", name: "광복절" }, { date: "2026-08-17", name: "대체휴일" },
  { date: "2026-09-24", name: "추석" }, { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석" }, { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "대체휴일" }, { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "성탄절" },
];

const DEFAULT_FT_TEMPLATES = [
  { code: "A", start: "09:30", end: "19:00", wdCounts: ["", 1, 2], weCounts: ["", 1, 2] },
  { code: "B", start: "10:30", end: "20:00", wdCounts: ["", 2, 2], weCounts: ["", "", ""] },
  { code: "C", start: "11:00", end: "20:30", wdCounts: ["", "", ""], weCounts: ["", 2, 2] },
  { code: "A/F", start: "10:00", end: "20:00", wdCounts: [2, "", ""], weCounts: ["", "", ""] },
  { code: "B/F", start: "10:00", end: "20:30", wdCounts: ["", "", ""], weCounts: [2, "", ""] },
];

const DEFAULT_PT_TEMPLATES = [
  { code: "A(6)", start: "10:30", end: "17:00" },
  { code: "B(6)", start: "13:30", end: "20:00" },
  { code: "C(6)", start: "14:00", end: "20:30" },
  { code: "D(8)", start: "11:00", end: "20:00" },
  { code: "E(8)", start: "11:30", end: "20:30" },
];

function defaultSettings() {
  return {
    storeName: "새 매장",
    year: 2026,
    startMonth: 5,
    weekdayMinFT: 2, weekdayMinPT: 1,
    weekendMinFT: 3, weekendMinPT: 1,
    restMode: "로테이션", // "로테이션" | "고정휴무" - 이 매장이 휴무를 어떻게 배정하는지
    consecRecommended: 3, consecMax: 4,
    dow: { 월: "평일", 화: "평일", 수: "평일", 목: "평일", 금: "평일(소프트-주말수준)", 토: "주말", 일: "주말" },
  };
}

function defaultStoreData() {
  return {
    settings: defaultSettings(),
    employees: DEFAULT_EMPLOYEES,
    tags: DEFAULT_TAGS,
    holidays: DEFAULT_HOLIDAYS,
    issueDays: [],
    personalTags: [],
    ftTemplates: DEFAULT_FT_TEMPLATES,
    ptTemplates: DEFAULT_PT_TEMPLATES,
    ftThresholds: { weekday: [2, 3, 4], weekend: [2, 3, 4] },
    prefCode: "A",
    annualLeaveGrants: {},
    shiftyCodeMap: [],
    fixedRestSchedules: [],
    dayPairOptions: DEFAULT_DAY_PAIR_OPTIONS,
  };
}

/* ============================================================
   날짜 / 캘린더 유틸
   ============================================================ */
function pad2(n) { return String(n).padStart(2, "0"); }

function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

function getWeekday(year, month, day) {
  const jsDow = new Date(year, month - 1, day).getDay(); // 0=Sun
  return WEEKDAYS[(jsDow + 6) % 7];
}

function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function buildMonthDays(year, month, holidays, issueDays) {
  const n = daysInMonth(year, month);
  const days = [];
  for (let d = 1; d <= n; d++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    const weekday = getWeekday(year, month, d);
    const hol = holidays.find((h) => h.date === dateStr);
    const iss = issueDays.find((i) => i.start && i.end && dateStr >= i.start && dateStr <= i.end);
    days.push({
      day: d, dateStr, weekday,
      holidayName: hol ? hol.name : "",
      issueName: iss ? iss.name : "",
      issueFT: iss && iss.ftOverride !== "" && iss.ftOverride !== undefined ? Number(iss.ftOverride) : null,
      issuePT: iss && iss.ptOverride !== "" && iss.ptOverride !== undefined ? Number(iss.ptOverride) : null,
    });
  }
  return days;
}

function dowBucket(settings, wd) { return settings.dow[wd] || "평일"; }
function isWeekendBucket(settings, day) {
  return dowBucket(settings, day.weekday) === "주말" || !!day.holidayName;
}
function requiredFT(settings, day) {
  if (day.issueFT !== null) return day.issueFT;
  return isWeekendBucket(settings, day) ? settings.weekendMinFT : settings.weekdayMinFT;
}
function requiredPT(settings, day) {
  if (day.issuePT !== null) return day.issuePT;
  return isWeekendBucket(settings, day) ? settings.weekendMinPT : settings.weekdayMinPT;
}
function satTarget(days) { return days.filter((d) => d.weekday === "토").length; }
function sunHolTarget(days) {
  return (
    days.filter((d) => d.weekday === "일").length +
    days.filter((d) => d.holidayName && d.weekday !== "토" && d.weekday !== "일").length
  );
}

function isActiveEmployee(e) {
  return e.status === "재직" || e.status === "퇴직예정";
}

// 정직원의 "소속"이 우리매장이 아니면(지원근무/스위칭근무) 기본적으로 자동배정 대상에서 제외.
// autoAssign을 true로 켜두면 예외적으로 자동배정 대상에 포함시킬 수 있음.
function isAutoAssignable(e) {
  if (e.type !== "정직원") return true;
  if (!e.memberType || e.memberType === "우리매장") return true;
  return !!e.autoAssign;
}

function isOffTag(tags, v) {
  if (!v) return false;
  const t = tags.find((t) => t.code === v);
  return t ? !t.countsAsAttend : false;
}

// 어떤 칸의 값이 근무조 집계상 어떤 코드로 계산되는지 반환
// (예: 반차(오후)/반반차는 그날 A조 근무 1명으로 집계 - 태그의 countsAsShift로 지정)
function shiftCodeOf(tags, v) {
  if (!v) return null;
  const t = (tags || []).find((t) => t.code === v);
  if (t && t.countsAsShift) return t.countsAsShift;
  return v;
}

function emptySchedule(employees, days1, days2) {
  const sched = { m1: {}, m2: {} };
  employees.forEach((e) => {
    sched.m1[e.id] = Array(days1.length).fill("");
    sched.m2[e.id] = Array(days2.length).fill("");
  });
  return sched;
}

// 기존 스케줄을 새 달력 길이에 맞춰 보존 이관 (직원 추가/월 변경 대응)
// 예전 방식(wd2/wd3/wd4 고정 3칸)으로 저장된 데이터를 배열 방식(wdCounts/weCounts)으로 자동 변환
function normalizeFtTemplates(ftTemplates) {
  return (ftTemplates || []).map((t) => {
    if (Array.isArray(t.wdCounts) && Array.isArray(t.weCounts)) return t;
    const { wd2, wd3, wd4, we2, we3, we4, ...rest } = t;
    return { ...rest, wdCounts: [wd2 ?? "", wd3 ?? "", wd4 ?? ""], weCounts: [we2 ?? "", we3 ?? "", we4 ?? ""] };
  });
}

function reconcileSchedule(oldSched, employees, days1, days2) {
  const fresh = emptySchedule(employees, days1, days2);
  if (!oldSched) return fresh;
  employees.forEach((e) => {
    const old1 = (oldSched.m1 && oldSched.m1[e.id]) || [];
    const old2 = (oldSched.m2 && oldSched.m2[e.id]) || [];
    for (let i = 0; i < days1.length && i < old1.length; i++) fresh.m1[e.id][i] = old1[i] || "";
    for (let i = 0; i < days2.length && i < old2.length; i++) fresh.m2[e.id][i] = old2[i] || "";
  });
  return fresh;
}

// 스케줄 화면 위쪽 "특이건(STORE MEMO, 도슨트, 연차 등)" 수기입력 행 - 직원과 별개로 자유롭게 추가/삭제
function emptyMemoRows(memoRowLabels, days1, days2) {
  const m1Memo = {}, m2Memo = {};
  (memoRowLabels || []).forEach((r) => {
    m1Memo[r.id] = Array(days1.length).fill("");
    m2Memo[r.id] = Array(days2.length).fill("");
  });
  return { m1Memo, m2Memo };
}

function reconcileMemoRows(oldMemo, memoRowLabels, days1, days2) {
  const fresh = emptyMemoRows(memoRowLabels, days1, days2);
  if (!oldMemo) return fresh;
  (memoRowLabels || []).forEach((r) => {
    const old1 = (oldMemo.m1Memo && oldMemo.m1Memo[r.id]) || [];
    const old2 = (oldMemo.m2Memo && oldMemo.m2Memo[r.id]) || [];
    for (let i = 0; i < days1.length && i < old1.length; i++) fresh.m1Memo[r.id][i] = old1[i] || "";
    for (let i = 0; i < days2.length && i < old2.length; i++) fresh.m2Memo[r.id][i] = old2[i] || "";
  });
  return fresh;
}

/* ============================================================
   핵심: 휴무/휴일 자동배정 (하루씩 순서대로 훑는 엔진)
   ============================================================ */
function applyPersonalTags(schedule, employees, personalTags, monthsMeta) {
  let applied = 0;
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  for (const pt of personalTags) {
    if (!pt.start || !pt.end || !pt.tagCode) continue;
    // 새 방식: empNames(다수 선택) / 예전 방식: empName(한 명) 둘 다 지원
    const names = pt.empNames && pt.empNames.length > 0 ? pt.empNames : (pt.empName ? [pt.empName] : []);
    if (names.length === 0) continue;
    for (const name of names) {
      const emp = employees.find((e) => e.name === name);
      if (!emp) continue;
      for (const { key, days } of monthsMeta) {
        for (const day of days) {
          if (day.dateStr >= pt.start && day.dateStr <= pt.end) {
            if (!next[key][emp.id][day.day - 1]) {
              next[key][emp.id][day.day - 1] = pt.tagCode;
              applied++;
            }
          }
        }
      }
    }
  }
  return { schedule: next, applied };
}

function buildTimeline(monthsMeta) {
  const timeline = [];
  monthsMeta.forEach(({ key, days }) => {
    days.forEach((day) => timeline.push({ key, day }));
  });
  return timeline;
}

/* ============================================================
   요청태그(RQ 등) 자동 전환
   "휴무/휴일 후보"로 지정된 태그(convertToRest=true)가 스케줄에 있으면
   그 사람의 남은 휴무/휴일 목표 안에서 휴무 또는 휴일로 바꿔준다.
   휴무/휴일을 다 소진했는데도 요청이 남으면, 연차 잔여가 충분한 경우에 한해 연차로 전환한다.
   (반차·반반차는 자동 전환하지 않고 그대로 둠 - 수기 조정 대상)
   ============================================================ */
function convertRequestTags(schedule, employees, tags, settings, monthsMeta, options) {
  const opt = options || {};
  const annualLeaveGrants = opt.annualLeaveGrants || {};
  const archive = opt.archive || {};
  const year = Number(settings?.year) || new Date().getFullYear();

  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  // 전환 대상 태그 (예: RQ)
  const requestCodes = new Set((tags || []).filter((t) => t.convertToRest).map((t) => t.code));
  if (requestCodes.size === 0) {
    return { schedule: next, toRest: 0, toLeave: 0, leaveDetails: [], leftOver: [], message: "" };
  }

  // 하루 단위 연차 태그 (8시간짜리, 연차종류가 "연차"인 것)
  const fullDayLeaveTag = (tags || []).find(
    (t) => t.trackAsLeave && Number(t.leaveHours) === 8 && (t.leavePool || "연차") === "연차"
  );

  // 저장된 월별기록 기준 연차 사용량 (예: 9·10월 스케줄을 짜는 시점이면 8월말까지의 실제 사용분)
  const usageFromArchive = computeLeaveUsage(year, tags, archive);

  const ftEmps = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e));
  const timeline = buildTimeline(monthsMeta);
  const monthTargets = {};
  monthsMeta.forEach(({ key, days }) => {
    monthTargets[key] = { humu: satTarget(days), hyuil: sunHolTarget(days) };
  });

  let toRest = 0, toLeave = 0;
  const leaveDetails = [];   // 연차로 바뀐 내역
  const leftOver = [];       // 휴무/휴일/연차 모두 부족해 그대로 남은 요청

  ftEmps.forEach((e) => {
    // 현재 이 사람의 월별 휴무/휴일 개수
    const counts = {};
    monthsMeta.forEach(({ key }) => {
      let humu = 0, hyuil = 0;
      (next[key][e.id] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
      counts[key] = { humu, hyuil };
    });

    // 이 사람의 연차 잔여(일) = 보유량 - 저장된 기록의 사용분 - 지금 스케줄에 이미 들어있는 연차
    let leaveRemainDays = 0;
    if (fullDayLeaveTag) {
      const grantDays = Number(((annualLeaveGrants[year] || {})["연차"] || {})[e.id]) || 0;
      const usedHoursArchive = usageFromArchive[e.id]?.byPool?.["연차"]?.totalHours || 0;
      let usedHoursCurrent = 0;
      monthsMeta.forEach(({ key }) => {
        (next[key][e.id] || []).forEach((v) => {
          const t = (tags || []).find((x) => x.code === v);
          if (t && t.trackAsLeave && (t.leavePool || "연차") === "연차") usedHoursCurrent += Number(t.leaveHours) || 0;
        });
      });
      leaveRemainDays = grantDays - (usedHoursArchive + usedHoursCurrent) / 8;
    }

    timeline.forEach(({ key, day }) => {
      const v = next[key][e.id]?.[day.day - 1] || "";
      if (!requestCodes.has(v)) return;

      // 1) 그 달 휴무가 남았으면 휴무로
      if (counts[key].humu < monthTargets[key].humu) {
        next[key][e.id][day.day - 1] = "휴무";
        counts[key].humu++;
        toRest++;
        return;
      }
      // 2) 그 달 휴일이 남았으면 휴일로
      if (counts[key].hyuil < monthTargets[key].hyuil) {
        next[key][e.id][day.day - 1] = "휴일";
        counts[key].hyuil++;
        toRest++;
        return;
      }
      // 3) 휴무/휴일을 다 썼으면, 연차 잔여가 하루 이상 남은 경우에만 연차로
      if (fullDayLeaveTag && leaveRemainDays >= 1) {
        next[key][e.id][day.day - 1] = fullDayLeaveTag.code;
        leaveRemainDays -= 1;
        toLeave++;
        leaveDetails.push(`${e.name} ${day.dateStr.slice(5).replace("-", "/")}`);
        return;
      }
      // 4) 그래도 안 되면 요청 태그 그대로 두고 알림 대상에 추가
      leftOver.push(`${e.name} ${day.dateStr.slice(5).replace("-", "/")}`);
    });
  });

  const parts = [];
  if (toRest > 0) parts.push(`요청을 휴무/휴일로 전환: ${toRest}건`);
  if (toLeave > 0) parts.push(`휴무/휴일이 모두 소진되어 연차로 등록: ${leaveDetails.join(", ")}`);
  if (leftOver.length > 0) parts.push(`휴무/휴일·연차 모두 부족해 그대로 남은 요청: ${leftOver.join(", ")} — 직접 처리해주세요`);

  return { schedule: next, toRest, toLeave, leaveDetails, leftOver, message: parts.join(" · ") };
}

// 고정휴무 요일쌍 기본값 (매장이 [공휴일·이슈일] 화면에서 자유롭게 추가/수정/삭제 가능한 목록의 초기값)
const DEFAULT_DAY_PAIR_OPTIONS = [
  { id: "dp_월화", label: "월화", weekdays: ["월", "화"] },
  { id: "dp_화수", label: "화수", weekdays: ["화", "수"] },
  { id: "dp_수목", label: "수목", weekdays: ["수", "목"] },
  { id: "dp_목금", label: "목금", weekdays: ["목", "금"] },
  { id: "dp_금토", label: "금토", weekdays: ["금", "토"] },
  { id: "dp_일월", label: "일월", weekdays: ["일", "월"] },
];

function lookupDayPair(dayPairOptions, label) {
  const found = (dayPairOptions || []).find((p) => p.label === label);
  return found ? found.weekdays : null;
}

// 종료월을 비워두면 "시작월 한 달만" 적용되도록 자동 보정
function resolveFixedRestEnd(f) {
  if (f.end) return f.end;
  if (!f.start) return "";
  const [y, m] = f.start.split("-").map(Number);
  if (!y || !m) return "";
  const lastDay = new Date(y, m, 0).getDate();
  return `${f.start.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

// 고정휴무: 개인지정태그(요청/이슈)가 이미 채워진 뒤에 실행됨.
// 하루 단위로 "그날 최소 출근인원"을 지키는 선까지만 채우고, 자리가 부족하면
// 우선순위(직원목록 순서) 후번인 직원의 휴무/휴일은 건너뛴다.
function applyFixedRestSchedules(schedule, employees, fixedRestSchedules, dayPairOptions, monthsMeta, settings, tags) {
  let applied = 0, skipped = 0;
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  const timeline = buildTimeline(monthsMeta);
  const ftEmps = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e));
  // 우선순위 = 직원목록에 등록된 순서 (앞선 사람이 우선)
  const priorityOf = {};
  ftEmps.forEach((e, i) => { priorityOf[e.id] = i; });
  // 월별 휴무/휴일 목표 (이 개수를 넘겨서 배정하지 않도록)
  const monthTarget = {};
  monthsMeta.forEach(({ key, days }) => {
    monthTarget[key] = { humu: satTarget(days), hyuil: sunHolTarget(days) };
  });

  timeline.forEach(({ key, day }) => {
    // 이 날짜에 고정휴무가 걸리는 직원들을 모으고, 우선순위 순으로 정렬
    const candidates = [];
    (fixedRestSchedules || []).forEach((f) => {
      const sortedWds = lookupDayPair(dayPairOptions, f.dayPair);
      const endDate = resolveFixedRestEnd(f);
      if (!f.start || !endDate || !sortedWds || !f.empNames || f.empNames.length === 0) return;
      if (day.dateStr < f.start || day.dateStr > endDate) return;
      const wdIdx = sortedWds.indexOf(day.weekday);
      if (wdIdx === -1) return;

      f.empNames.forEach((empName) => {
        const emp = ftEmps.find((e) => e.name === empName);
        if (!emp) return;
        const cur = next[key][emp.id]?.[day.day - 1] || "";
        if (cur !== "") return; // 개인지정태그 등으로 이미 채워진 칸은 건드리지 않음
        candidates.push({ empId: emp.id, code: wdIdx === 0 ? "휴무" : "휴일" });
      });
    });
    if (candidates.length === 0) return;
    candidates.sort((a, b) => (priorityOf[a.empId] ?? 999) - (priorityOf[b.empId] ?? 999));

    // 그날 이미 확정된 출근 인원수 계산 (빈칸은 아직 미정이므로 출근 가능 인원으로 봄)
    let alreadyOff = 0, blankCount = 0;
    ftEmps.forEach((e) => {
      const v = next[key][e.id]?.[day.day - 1] || "";
      if (v === "") blankCount++;
      else if (isOffTag(tags || [], v)) alreadyOff++;
    });
    const required = requiredFT(settings, day);
    const totalFT = ftEmps.length;
    // 지금 상태에서 최대로 더 쉴 수 있는 인원 = 전체 - 필요인원 - 이미 쉬는 인원
    let slots = totalFT - required - alreadyOff;
    if (slots < 0) slots = 0;

    candidates.forEach((c) => {
      if (slots <= 0) { skipped++; return; }
      // 그 달의 휴무/휴일 목표를 넘지 않도록 제한
      // (예: 그 달에 해당 요일이 5번 있는데 목표는 4개인 경우, 5번째는 배정하지 않음)
      let cur = 0;
      (next[key][c.empId] || []).forEach((v) => { if (v === c.code) cur++; });
      const target = c.code === "휴무" ? monthTarget[key].humu : monthTarget[key].hyuil;
      if (cur >= target) { skipped++; return; }

      next[key][c.empId][day.day - 1] = c.code;
      slots--;
      applied++;
    });
  });

  return { schedule: next, applied, skipped };
}

function isFixedRestCovered(fixedRestSchedules, dayPairOptions, empName, dateStr) {
  return (fixedRestSchedules || []).some((f) => {
    const endDate = resolveFixedRestEnd(f);
    return lookupDayPair(dayPairOptions, f.dayPair) && (f.empNames || []).includes(empName) &&
      f.start && endDate && dateStr >= f.start && dateStr <= endDate;
  });
}

// 이 직원이 (해당 기간 안에서) 고정휴무 대상인지 - 연속근무 경고 제외 판단용
function isFixedRestEmployee(fixedRestSchedules, dayPairOptions, empName) {
  return (fixedRestSchedules || []).some(
    (f) => lookupDayPair(dayPairOptions, f.dayPair) && (f.empNames || []).includes(empName) && f.start
  );
}

function assignRestDays(schedule, employees, tags, settings, monthsMeta, fixedRestSchedules, dayPairOptions) {
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  const ftEmps = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e) && isAutoAssignable(e));
  const ftCount = ftEmps.length;
  if (ftCount === 0) return { schedule: next, message: "정직원이 없어 자동배정을 건너뛰었습니다.", inserted: 0 };

  const timeline = buildTimeline(monthsMeta);
  const totalDays = timeline.length;

  const monthTargets = {};
  monthsMeta.forEach(({ key, days }) => {
    monthTargets[key] = { sat: satTarget(days), sunHol: sunHolTarget(days) };
  });
  const target =
    monthTargets.m1.sat + monthTargets.m1.sunHol + monthTargets.m2.sat + monthTargets.m2.sunHol;

  const streak = {}, restCount = {};
  ftEmps.forEach((e) => { streak[e.id] = 0; restCount[e.id] = 0; });
  const selNew = {};
  ftEmps.forEach((e) => { selNew[e.id] = new Set(); });

  let inserted = 0;

  timeline.forEach((slot, idx) => {
    const { key, day } = slot;
    const cellsToday = {};
    ftEmps.forEach((e) => (cellsToday[e.id] = next[key][e.id][day.day - 1] || ""));
    const isBlank = {};
    ftEmps.forEach((e) => (isBlank[e.id] = cellsToday[e.id] === ""));
    // 고정휴무가 적용되는 사람은 그날 이 로테이션 배정의 후보에서 제외 (이미 고정 패턴대로 확정됨)
    const isFixedToday = {};
    ftEmps.forEach((e) => (isFixedToday[e.id] = isFixedRestCovered(fixedRestSchedules, dayPairOptions, e.name, day.dateStr)));

    let alreadyOff = 0;
    ftEmps.forEach((e) => { if (!isBlank[e.id] && isOffTag(tags, cellsToday[e.id])) alreadyOff++; });

    const required = requiredFT(settings, day);
    let slackHard = ftCount - required - alreadyOff;
    if (slackHard < 0) slackHard = 0;
    let slackSoft = slackHard;
    if (dowBucket(settings, day.weekday) === "평일(소프트-주말수준)") {
      slackSoft = ftCount - settings.weekendMinFT - alreadyOff;
      if (slackSoft < 0) slackSoft = 0;
      if (slackSoft > slackHard) slackSoft = slackHard;
    }

    const selected = new Set();
    let usedSlots = 0;
    const urgentThreshold = Number(settings.consecRecommended) || 3; // 이 이상 연속근무하면 "급한 사람"으로 우선 배정

    // 1단계: 급한 사람(연속근무 권장 상한 이상) - 소프트 한도
    while (true) {
      let bestId = null, bestStreak = -1;
      ftEmps.forEach((e) => {
        if (isBlank[e.id] && !isFixedToday[e.id] && !selected.has(e.id) && streak[e.id] >= urgentThreshold && streak[e.id] > bestStreak) {
          bestStreak = streak[e.id]; bestId = e.id;
        }
      });
      if (!bestId) break;
      if (usedSlots < slackSoft) { selected.add(bestId); usedSlots++; } else break;
    }
    // 1b단계: 하드 한도까지
    while (true) {
      let bestId = null, bestStreak = -1;
      ftEmps.forEach((e) => {
        if (isBlank[e.id] && !isFixedToday[e.id] && !selected.has(e.id) && streak[e.id] >= urgentThreshold && streak[e.id] > bestStreak) {
          bestStreak = streak[e.id]; bestId = e.id;
        }
      });
      if (!bestId) break;
      if (usedSlots < slackHard) { selected.add(bestId); usedSlots++; } else break;
    }
    // 2단계: 선제 배정 (페이스 뒤처짐)
    while (true) {
      let bestId = null, bestRest = Infinity;
      ftEmps.forEach((e) => {
        if (isBlank[e.id] && !isFixedToday[e.id] && !selected.has(e.id) && streak[e.id] >= 1 && restCount[e.id] < bestRest) {
          bestRest = restCount[e.id]; bestId = e.id;
        }
      });
      if (!bestId) break;
      if (usedSlots >= slackSoft) break;
      const paceTarget = (target * (idx + 1)) / totalDays;
      if (restCount[bestId] < paceTarget) { selected.add(bestId); usedSlots++; } else break;
    }

    ftEmps.forEach((e) => {
      if (isBlank[e.id]) {
        if (selected.has(e.id)) {
          selNew[e.id].add(idx);
          restCount[e.id]++;
          streak[e.id] = 0;
          inserted++;
        } else {
          streak[e.id]++;
        }
      } else {
        if (isOffTag(tags, cellsToday[e.id])) { streak[e.id] = 0; restCount[e.id]++; }
        else streak[e.id]++;
      }
    });
  });

  // 2단계-A: 주 단위 선행배치 (휴무 선행, 휴일 후행)
  ftEmps.forEach((e) => {
    let weekHasHuMu = false;
    timeline.forEach((slot, idx) => {
      const { key, day } = slot;
      if (day.weekday === "월") weekHasHuMu = false;
      const arr = next[key][e.id];
      const cur = arr[day.day - 1] || "";
      if (selNew[e.id].has(idx)) {
        if (!weekHasHuMu) { arr[day.day - 1] = "휴무"; weekHasHuMu = true; }
        else arr[day.day - 1] = "휴일";
      } else if (cur === "휴무") weekHasHuMu = true;
    });
  });

  // 2단계-B: 월별 목표 보정
  monthsMeta.forEach(({ key }) => {
    const satT = monthTargets[key].sat;
    ftEmps.forEach((e) => {
      const arr = next[key][e.id];
      const idxsThisMonth = [];
      timeline.forEach((slot, idx) => { if (slot.key === key && selNew[e.id].has(idx)) idxsThisMonth.push(idx); });
      const humuCount = arr.filter((v) => v === "휴무").length;
      const deficit = satT - humuCount;
      if (deficit > 0) {
        let converted = 0;
        for (const idx of idxsThisMonth) {
          if (converted >= deficit) break;
          const day = timeline[idx].day;
          if (arr[day.day - 1] === "휴일") { arr[day.day - 1] = "휴무"; converted++; }
        }
      } else if (deficit < 0) {
        let toRemove = -deficit, removed = 0;
        for (let i = idxsThisMonth.length - 1; i >= 0; i--) {
          if (removed >= toRemove) break;
          const idx = idxsThisMonth[i];
          const day = timeline[idx].day;
          if (arr[day.day - 1] === "휴무") { arr[day.day - 1] = "휴일"; removed++; }
        }
      }
    });
  });

  return { schedule: next, inserted, message: `새로 배정한 휴무/휴일: ${inserted}건` };
}

/* ============================================================
   핵심: 근무형태(근무조) 자동배정
   ============================================================ */
function pickThresholdIndex(thresholds, value) {
  let bestIdx = 0, bestDiff = Infinity;
  (thresholds || []).forEach((t, i) => {
    const diff = Math.abs(Number(value) - Number(t));
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  });
  return bestIdx;
}

/* ============================================================
   3단계: 남은 휴무/휴일 추가 배정
   1·2단계 실행 후에도 목표 대비 덜 쓴 휴무/휴일이 있으면,
   그날 쉬어도 최소 출근인원이 유지되는(=AVAILABLE) 날짜에만 추가로 배정한다.
   - 휴무는 그 달 안에서만 채움(월별 목표 유지), 휴일은 그 달 우선 → 부족하면 다른 달까지 확장
   - 연속근무 상한을 넘기지 않도록 확인 (고정휴무 대상자는 이 검사 생략)
   ============================================================ */
// 한 주(월~일) 안에서 쉬는 날이 여러 개일 때, 규칙에 맞게 휴무/휴일을 정리한다.
//  - 한 주에 휴무는 최대 1개, 그 주의 가장 앞선 쉬는 날에 배치
//  - 단, 그 달의 휴무 목표 개수를 넘지 않도록 조절 (초과분은 휴일로)
//  - 연차·경조사 등 확정휴무 태그는 건드리지 않고 휴무/휴일끼리만 교체
function normalizeWeeklyRest(sched, ftEmps, monthsMeta) {
  const timeline = buildTimeline(monthsMeta);
  const humuTargetOf = {};
  monthsMeta.forEach(({ key, days }) => { humuTargetOf[key] = satTarget(days); });

  ftEmps.forEach((e) => {
    // 주 단위로 쉬는 날 묶기
    const weeks = [];
    let week = [];
    timeline.forEach(({ key, day }) => {
      if (day.weekday === "월" && week.length > 0) { weeks.push(week); week = []; }
      week.push({ key, day });
    });
    if (week.length > 0) weeks.push(week);

    // 각 주에서 쉬는 날(휴무/휴일) 목록 추출
    const weekRests = weeks.map((w) =>
      w.filter(({ key, day }) => {
        const v = sched[key][e.id]?.[day.day - 1] || "";
        return v === "휴무" || v === "휴일";
      })
    );

    // 일단 전부 휴일로 초기화
    weekRests.forEach((rests) => {
      rests.forEach(({ key, day }) => { sched[key][e.id][day.day - 1] = "휴일"; });
    });

    // 각 주의 첫 쉬는 날을 휴무로 지정하되, 그 날이 속한 달의 휴무 목표를 넘지 않도록
    const humuUsed = {};
    monthsMeta.forEach(({ key }) => { humuUsed[key] = 0; });
    weekRests.forEach((rests) => {
      if (rests.length === 0) return;
      const first = rests[0];
      if (humuUsed[first.key] < humuTargetOf[first.key]) {
        sched[first.key][e.id][first.day.day - 1] = "휴무";
        humuUsed[first.key]++;
      }
    });

    // 주가 부족해서 월별 휴무 목표를 못 채웠다면,
    // "아직 휴무가 없는 주"의 휴일을 휴무로 승격 (한 주에 휴무 1개 규칙 유지)
    monthsMeta.forEach(({ key }) => {
      let need = humuTargetOf[key] - humuUsed[key];
      if (need <= 0) return;
      for (let wi = 0; wi < weekRests.length && need > 0; wi++) {
        const rests = weekRests[wi];
        if (rests.length === 0) continue;
        // 이 주에 이미 휴무가 있으면 건너뜀
        const hasHumu = rests.some(({ key: k, day }) => (sched[k][e.id]?.[day.day - 1] || "") === "휴무");
        if (hasHumu) continue;
        // 이 달에 속한 휴일 중 가장 앞선 날을 휴무로 승격
        const target = rests.find(({ key: k, day }) => k === key && (sched[k][e.id]?.[day.day - 1] || "") === "휴일");
        if (!target) continue;
        sched[target.key][e.id][target.day.day - 1] = "휴무";
        humuUsed[key]++;
        need--;
      }
    });
  });
}

/* ============================================================
   4단계: 최종 조율
   1~3단계를 마친 뒤에도 남아있는 문제를 서로 자리를 바꿔가며 해소한다.
   (A) 연속근무 상한을 넘긴 사람의 근무일을, 그날 쉬고 있던 "여유 있는 사람"과 맞바꿈
   (B) 휴무/휴일이 목표보다 초과한 사람과 부족한 사람 사이에서 쉬는 날을 넘겨줌
   두 경우 모두 최소 출근인원은 그대로 유지된다 (한 명이 쉬면 다른 한 명이 나오므로).
   ============================================================ */
function finalAdjust(schedule, employees, tags, settings, monthsMeta, fixedRestSchedules, dayPairOptions) {
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  const ftEmps = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e) && isAutoAssignable(e));
  if (ftEmps.length === 0) return { schedule: next, streakFixed: 0, balanceFixed: 0, message: "정직원이 없어 조율을 건너뛰었습니다." };

  const timeline = buildTimeline(monthsMeta);
  const workCodeSet = new Set((tags || []).filter((t) => t.countsAsAttend).map((t) => t.code));
  const perMonth = {};
  monthsMeta.forEach(({ key, days }) => {
    perMonth[key] = { humuTarget: satTarget(days), hyuilTarget: sunHolTarget(days) };
  });

  const limitOf = (emp) => fixedRestLimitOf(fixedRestSchedules, dayPairOptions, emp.name, settings);

  const maxStreakOf = (empId) => {
    let consec = 0, maxRun = 0;
    timeline.forEach(({ key, day }) => {
      const v = next[key][empId]?.[day.day - 1] || "";
      if (v !== "" && isOffTag(tags, v)) consec = 0;
      else { consec++; if (consec > maxRun) maxRun = consec; }
    });
    return maxRun;
  };

  const countOf = (empId, key) => {
    let humu = 0, hyuil = 0;
    (next[key][empId] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
    return { humu, hyuil };
  };

  const changedDays = new Set();

  /* --- (A) 연속근무 상한 초과 해소: 초과자의 근무일 ↔ 여유자의 쉬는 날 맞교환 --- */
  let streakFixed = 0;
  for (let round = 0; round < 30; round++) {
    // 상한을 넘긴 사람 찾기
    const over = ftEmps.find((e) => maxStreakOf(e.id) > limitOf(e));
    if (!over) break;

    let swapped = false;
    // 이 사람이 근무 중인 날들을 훑으며, 그날 쉬고 있는 "바꿔줄 수 있는 사람"을 찾는다
    for (const { key, day } of timeline) {
      const myVal = next[key][over.id]?.[day.day - 1] || "";
      if (!workCodeSet.has(myVal)) continue; // 내가 근무 중인 날만 대상

      // 이 날 쉬고 있는 사람 중, 그 휴식을 넘겨줘도 본인이 상한을 안 넘는 사람
      const donors = ftEmps.filter((other) => {
        if (other.id === over.id) return false;
        const theirVal = next[key][other.id]?.[day.day - 1] || "";
        if (theirVal !== "휴무" && theirVal !== "휴일") return false; // 휴무/휴일만 교환 (연차 등은 제외)
        return true;
      });

      for (const donor of donors) {
        const theirVal = next[key][donor.id][day.day - 1];
        // 맞교환 시도
        next[key][over.id][day.day - 1] = theirVal;
        next[key][donor.id][day.day - 1] = myVal;

        const okOver = maxStreakOf(over.id) <= limitOf(over);
        const okDonor = maxStreakOf(donor.id) <= limitOf(donor);
        if (okOver && okDonor) {
          changedDays.add(`${key}|${day.day}`);
          streakFixed++;
          swapped = true;
          break;
        }
        // 되돌리기
        next[key][over.id][day.day - 1] = myVal;
        next[key][donor.id][day.day - 1] = theirVal;
      }
      if (swapped) break;
    }
    if (!swapped) break; // 더 이상 고칠 수 없음
  }

  /* --- (B) 휴무/휴일 초과/부족 재조정: 초과자 → 부족자에게 쉬는 날 넘김 --- */
  // 초과한 코드와 부족한 코드가 서로 달라도(예: A는 휴일 초과, B는 휴무 부족) 교환할 수 있게 처리한다.
  let balanceFixed = 0;
  for (let round = 0; round < 80; round++) {
    let moved = false;

    for (const { key } of monthsMeta) {
      // 이 달에서 초과한 (사람, 코드) 목록과 부족한 (사람, 코드) 목록을 각각 모은다
      const surplusList = [];
      const deficitList = [];
      ftEmps.forEach((e) => {
        const c = countOf(e.id, key);
        if (c.humu > perMonth[key].humuTarget) surplusList.push({ emp: e, code: "휴무" });
        if (c.hyuil > perMonth[key].hyuilTarget) surplusList.push({ emp: e, code: "휴일" });
        if (c.humu < perMonth[key].humuTarget) deficitList.push({ emp: e, code: "휴무" });
        if (c.hyuil < perMonth[key].hyuilTarget) deficitList.push({ emp: e, code: "휴일" });
      });
      if (surplusList.length === 0 || deficitList.length === 0) continue;

      for (const giver of surplusList) {
        for (const taker of deficitList) {
          if (giver.emp.id === taker.emp.id) {
            // 같은 사람이 한 코드는 초과, 다른 코드는 부족한 경우 -> 그 자리에서 코드만 바꿔줌
            const slot = monthsMeta.find((m) => m.key === key).days.find(
              (day) => (next[key][giver.emp.id]?.[day.day - 1] || "") === giver.code
            );
            if (!slot) continue;
            next[key][giver.emp.id][slot.day - 1] = taker.code;
            balanceFixed++;
            moved = true;
            break;
          }

          // 다른 사람끼리: giver가 쉬는 날에 taker가 근무 중이면 맞바꿈
          const slot = timeline.find(({ key: k, day }) => {
            if (k !== key) return false;
            if ((next[k][giver.emp.id]?.[day.day - 1] || "") !== giver.code) return false;
            const takerVal = next[k][taker.emp.id]?.[day.day - 1] || "";
            return workCodeSet.has(takerVal);
          });
          if (!slot) continue;

          const takerVal = next[slot.key][taker.emp.id][slot.day.day - 1];
          next[slot.key][taker.emp.id][slot.day.day - 1] = taker.code;  // 받는 사람은 부족한 코드로
          next[slot.key][giver.emp.id][slot.day.day - 1] = takerVal;    // 주는 사람은 근무로

          if (maxStreakOf(giver.emp.id) <= limitOf(giver.emp) && maxStreakOf(taker.emp.id) <= limitOf(taker.emp)) {
            changedDays.add(`${slot.key}|${slot.day.day}`);
            balanceFixed++;
            moved = true;
            break;
          }
          // 되돌리기
          next[slot.key][taker.emp.id][slot.day.day - 1] = takerVal;
          next[slot.key][giver.emp.id][slot.day.day - 1] = giver.code;
        }
        if (moved) break;
      }
      if (moved) break;
    }
    if (!moved) break;
  }

  /* --- (C) 받아줄 사람이 없는 초과분은, 같은 사람의 "부족한 다른 달"로 옮김 --- */
  for (let round = 0; round < 40; round++) {
    let moved = false;
    for (const e of ftEmps) {
      for (const code of ["휴무", "휴일"]) {
        const targetKey = code === "휴무" ? "humuTarget" : "hyuilTarget";
        const countKey = code === "휴무" ? "humu" : "hyuil";

        // 초과한 달과 부족한 달 찾기
        const overMonth = monthsMeta.find(({ key }) => countOf(e.id, key)[countKey] > perMonth[key][targetKey]);
        const underMonth = monthsMeta.find(({ key }) => countOf(e.id, key)[countKey] < perMonth[key][targetKey]);
        if (!overMonth || !underMonth) continue;

        // 초과한 달에서 이 코드로 쉬는 날 하나를 근무로 바꾸고
        const giveSlot = overMonth.days.find((day) => (next[overMonth.key][e.id]?.[day.day - 1] || "") === code);
        // 부족한 달에서 근무 중이면서 그날 여유가 있는 날 하나를 이 코드로 바꿈
        const takeSlot = underMonth.days.find((day) => {
          const v = next[underMonth.key][e.id]?.[day.day - 1] || "";
          if (!workCodeSet.has(v)) return false;
          // 그날 한 명 더 쉬어도 최소인원 유지되는지
          let off = 0;
          ftEmps.forEach((o) => {
            const ov = next[underMonth.key][o.id]?.[day.day - 1] || "";
            if (ov !== "" && isOffTag(tags, ov)) off++;
          });
          return (ftEmps.length - off) - 1 >= requiredFT(settings, day);
        });
        if (!giveSlot || !takeSlot) continue;

        const giveBefore = next[overMonth.key][e.id][giveSlot.day - 1];
        const takeBefore = next[underMonth.key][e.id][takeSlot.day - 1];
        next[overMonth.key][e.id][giveSlot.day - 1] = "";      // 근무로 되돌림(2단계 재배정이 채움)
        next[underMonth.key][e.id][takeSlot.day - 1] = code;

        if (maxStreakOf(e.id) <= limitOf(e)) {
          changedDays.add(`${overMonth.key}|${giveSlot.day}`);
          changedDays.add(`${underMonth.key}|${takeSlot.day}`);
          balanceFixed++;
          moved = true;
          break;
        }
        next[overMonth.key][e.id][giveSlot.day - 1] = giveBefore;
        next[underMonth.key][e.id][takeSlot.day - 1] = takeBefore;
      }
      if (moved) break;
    }
    if (!moved) break;
  }

  /* --- (D) 그래도 남은 초과분은 근무로 되돌림 (목표보다 더 쉬지 않도록) --- */
  // 주는 사람도 받는 사람도 없는 경우(예: 전원이 동시에 초과) 초과한 쉬는 날을 근무로 되돌린다.
  let revertedToWork = 0;
  for (let round = 0; round < 60; round++) {
    let reverted = false;
    for (const e of ftEmps) {
      for (const { key, days } of monthsMeta) {
        const c = countOf(e.id, key);
        const overHumu = c.humu - perMonth[key].humuTarget;
        const overHyuil = c.hyuil - perMonth[key].hyuilTarget;
        const code = overHyuil > 0 ? "휴일" : (overHumu > 0 ? "휴무" : null);
        if (!code) continue;

        // 뒤쪽 날짜부터 되돌려서 앞부분 패턴을 최대한 보존
        for (let i = days.length - 1; i >= 0; i--) {
          const day = days[i];
          if ((next[key][e.id]?.[day.day - 1] || "") !== code) continue;
          next[key][e.id][day.day - 1] = "";  // 근무로 (2단계 재배정이 코드를 채움)
          if (maxStreakOf(e.id) <= limitOf(e)) {
            changedDays.add(`${key}|${day.day}`);
            revertedToWork++;
            reverted = true;
            break;
          }
          next[key][e.id][day.day - 1] = code; // 연속근무가 나빠지면 되돌리지 않음
        }
        if (reverted) break;
      }
      if (reverted) break;
    }
    if (!reverted) break;
  }

  // 주 단위 규칙 재정리 (휴무 1개 우선 배치)
  normalizeWeeklyRest(next, ftEmps, monthsMeta);

  // 남은 문제 확인
  const stillOver = ftEmps.filter((e) => maxStreakOf(e.id) > limitOf(e)).map((e) => `${e.name}(${maxStreakOf(e.id)}일)`);
  const stillShort = [];   // 목표에 못 미친 경우 - 실제로 조치가 필요
  const extraRest = [];    // 목표를 채우고 더 쉰 경우 - 문제 아님(참고용)
  ftEmps.forEach((e) => {
    const shortParts = [], extraParts = [];
    monthsMeta.forEach(({ key, label }) => {
      const c = countOf(e.id, key);
      const dh = c.humu - perMonth[key].humuTarget;
      const dy = c.hyuil - perMonth[key].hyuilTarget;
      if (dh < 0) shortParts.push(`${label || key} 휴무 ${dh}`);
      if (dy < 0) shortParts.push(`${label || key} 휴일 ${dy}`);
      if (dh > 0) extraParts.push(`${label || key} 휴무 +${dh}`);
      if (dy > 0) extraParts.push(`${label || key} 휴일 +${dy}`);
    });
    if (shortParts.length > 0) stillShort.push(`${e.name}(${shortParts.join(", ")})`);
    if (extraParts.length > 0) extraRest.push(`${e.name}(${extraParts.join(", ")})`);
  });

  const parts = [];
  parts.push(`연속근무 조율: ${streakFixed}건`);
  parts.push(`휴무/휴일 균형 조율: ${balanceFixed}건`);
  if (revertedToWork > 0) parts.push(`초과분을 근무로 되돌림: ${revertedToWork}건`);
  if (stillOver.length > 0) parts.push(`아직 연속근무 상한 초과: ${stillOver.join(", ")} — 수기 조정 필요`);
  if (stillShort.length > 0) parts.push(`목표에 못 미침: ${stillShort.join(", ")} — 수기 조정 필요`);
  if (extraRest.length > 0) parts.push(`목표보다 초과해서 쉬는 인원: ${extraRest.join(", ")} — 연차로 처리하거나 근무로 되돌려주세요`);
  if (stillOver.length === 0 && stillShort.length === 0 && extraRest.length === 0) {
    parts.push("모든 인원이 연속근무 상한과 휴무/휴일 목표를 정확히 만족합니다");
  }

  return {
    schedule: next,
    streakFixed, balanceFixed,
    changedDayCount: changedDays.size,
    stillOver, stillShort, extraRest,
    message: parts.join(" · "),
  };
}

function assignRemainingRest(schedule, employees, tags, settings, monthsMeta, fixedRestSchedules, dayPairOptions) {
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  const ftEmps = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e) && isAutoAssignable(e));
  if (ftEmps.length === 0) return { schedule: next, added: 0, message: "정직원이 없어 추가 배정을 건너뛰었습니다." };

  const consecMax = Number(settings.consecMax) || 99;
  // 근무코드로 인정되는 코드들(= 나중에 휴무로 바꿔도 되는 칸). 확정휴무/개인지정태그는 제외
  const workCodeSet = new Set((tags || []).filter((t) => t.countsAsAttend).map((t) => t.code));
  const changedDays = new Set(); // "key|day" - 근무조 재배정이 필요한 날짜

  // 그날 한 명 더 쉬어도 최소 출근인원이 유지되는지
  const hasRoom = (key, day) => {
    let off = 0;
    ftEmps.forEach((e) => {
      const v = next[key][e.id]?.[day.day - 1] || "";
      if (v !== "" && isOffTag(tags, v)) off++;
    });
    // 아직 안 채워진 칸(빈칸)은 출근으로 간주
    const attending = ftEmps.length - off;
    return attending - 1 >= requiredFT(settings, day);
  };

  // 이 칸에 휴무/휴일을 넣어도 되는지:
  // - 빈칸이면 OK
  // - 일반 근무코드(A/B/C 등)가 들어있어도 OK (그날 근무조는 나중에 재배정)
  // - 확정휴무/연차/개인지정태그 등은 건드리지 않음
  const canRest = (key, day, empId) => {
    const v = next[key][empId]?.[day.day - 1] || "";
    if (v === "") return true;
    return workCodeSet.has(v);
  };

  // 휴무/휴일을 실제로 넣으면서, 근무코드를 덮어쓴 경우 그날을 재배정 대상으로 기록
  const placeRest = (key, day, empId, code) => {
    const prev = next[key][empId]?.[day.day - 1] || "";
    next[key][empId][day.day - 1] = code;
    if (prev !== "" && workCodeSet.has(prev)) changedDays.add(`${key}|${day.day}`);
  };

  // 2개월 전체를 하루씩 이어붙인 타임라인 (연속근무 계산용)
  const flatTimeline = buildTimeline(monthsMeta);
  const flatIndexOf = {};
  flatTimeline.forEach((slot, i) => { flatIndexOf[`${slot.key}|${slot.day.day}`] = i; });

  // 이 직원의 현재 최대 연속근무 일수
  const maxStreakOf = (empId) => {
    let consec = 0, maxRun = 0;
    flatTimeline.forEach(({ key, day }) => {
      const v = next[key][empId]?.[day.day - 1] || "";
      if (v !== "" && isOffTag(tags, v)) consec = 0;
      else { consec++; if (consec > maxRun) maxRun = consec; }
    });
    return maxRun;
  };

  // 이 직원이 "가장 길게 연속근무 중인 구간"의 한가운데쯤 되는 날짜를 우선 고르기 위해,
  // 특정 날짜가 얼마나 긴 연속근무 구간에 속해 있는지 계산
  const streakLengthAt = (empId, key, dayNum) => {
    const idx = flatIndexOf[`${key}|${dayNum}`];
    if (idx === undefined) return 0;
    const isWork = (i) => {
      const slot = flatTimeline[i];
      if (!slot) return false;
      const v = next[slot.key][empId]?.[slot.day.day - 1] || "";
      return !(v !== "" && isOffTag(tags, v));
    };
    if (!isWork(idx)) return 0;
    let len = 1;
    for (let i = idx - 1; i >= 0 && isWork(i); i--) len++;
    for (let i = idx + 1; i < flatTimeline.length && isWork(i); i++) len++;
    return len;
  };

  let added = 0;
  const perMonth = {};
  monthsMeta.forEach(({ key, days }) => {
    perMonth[key] = { humuTarget: satTarget(days), hyuilTarget: sunHolTarget(days), days };
  });


  // 주 단위 묶음 (한 주에 휴무 1개 규칙 확인용)
  const weeksOfMonth = {};
  monthsMeta.forEach(({ key, days }) => {
    const weeks = [];
    let cur = [];
    days.forEach((day) => {
      if (day.weekday === "월" && cur.length > 0) { weeks.push(cur); cur = []; }
      cur.push(day);
    });
    if (cur.length > 0) weeks.push(cur);
    weeksOfMonth[key] = weeks;
  });
  const weekIndexOf = (key, dayNum) => {
    const weeks = weeksOfMonth[key];
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].some((d) => d.day === dayNum)) return i;
    }
    return -1;
  };

  // 각 직원의 월별 현재 휴무/휴일 개수
  const counts = {};
  ftEmps.forEach((e) => {
    counts[e.id] = {};
    monthsMeta.forEach(({ key }) => {
      let humu = 0, hyuil = 0;
      (next[key][e.id] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
      counts[e.id][key] = { humu, hyuil };
    });
  });

  const shortOf = (empId) => {
    let humu = 0, hyuil = 0;
    monthsMeta.forEach(({ key }) => {
      humu += Math.max(0, perMonth[key].humuTarget - counts[empId][key].humu);
      hyuil += Math.max(0, perMonth[key].hyuilTarget - counts[empId][key].hyuil);
    });
    return { humu, hyuil, total: humu + hyuil };
  };

  const timelineAll = buildTimeline(monthsMeta);
  const placedCount = {};

  // 날짜를 순서대로 돌면서, 그날 여유가 있으면 "가장 부족한 직원"에게 하나씩 배정
  // (한 명이 좋은 자리를 독식하지 않도록, 자리마다 대상자를 다시 고름)
  // 1차: 한 주에 2일까지만 / 2차: 그래도 부족하면 주 3일까지 허용
  let allowThirdRestDay = false;
  const runPass = () => {
  timelineAll.forEach(({ key, day }) => {
    let guard = 0;
    while (guard < 20) {
      guard++;
      if (!hasRoom(key, day)) break;

      // 이 날 배정 가능한 후보 = 빈칸이거나 일반 근무코드인 사람 중, 이 달에 아직 부족분이 있는 사람
      const candidates = ftEmps.filter((e) => {
        if (!canRest(key, day, e.id)) return false;
        // 이 달 기준 부족분 (다른 달 부족분 때문에 이 달을 초과 배정하지 않도록)
        const humuShortHere = perMonth[key].humuTarget - counts[e.id][key].humu;
        const hyuilShortHere = perMonth[key].hyuilTarget - counts[e.id][key].hyuil;
        if (humuShortHere <= 0 && hyuilShortHere <= 0) return false;
        // 한 주에 쉬는 날이 너무 몰리지 않도록 제한.
        // 기본은 주 2일(휴무1+휴일1)이지만, 그렇게 해서는 목표를 못 채우는 경우
        // (예: 고정휴무 매장에서 공휴일이 많은 달) 주 3일까지는 허용한다.
        const wi = weekIndexOf(key, day.day);
        if (wi >= 0) {
          const restsInWeek = weeksOfMonth[key][wi].filter((d) => {
            const v = next[key][e.id]?.[d.day - 1] || "";
            return v === "휴무" || v === "휴일";
          }).length;
          const weekLimit = allowThirdRestDay ? 3 : 2;
          if (restsInWeek >= weekLimit) return false;
        }
        return true;
      });
      if (candidates.length === 0) break;

      // 이 달에 부족분이 가장 많은 사람 우선. 단, 연속근무가 상한을 넘고 있는 사람이 있으면 그 사람을 최우선.
      const monthShortOf = (empId) =>
        Math.max(0, perMonth[key].humuTarget - counts[empId][key].humu) +
        Math.max(0, perMonth[key].hyuilTarget - counts[empId][key].hyuil);
      const overLimitOf = (emp) => {
        const limit = fixedRestLimitOf(fixedRestSchedules, dayPairOptions, emp.name, settings);
        return maxStreakOf(emp.id) > limit ? 1 : 0;
      };
      candidates.sort((a, b) => {
        // 1순위: 연속근무 상한을 이미 넘긴 사람 (이 배정으로 끊어줘야 함)
        const oa = overLimitOf(a), ob = overLimitOf(b);
        if (ob !== oa) return ob - oa;
        // 2순위: 이 달 부족분이 많은 사람
        const sa = monthShortOf(a.id), sb = monthShortOf(b.id);
        if (sb !== sa) return sb - sa;
        // 3순위: 지금까지 배정을 덜 받은 사람
        return (placedCount[a.id] || 0) - (placedCount[b.id] || 0);
      });

      // 후보를 순서대로 시도 - 한 명이 연속근무 제약에 걸려도 그날을 포기하지 않고 다음 후보를 본다
      let placedSomeone = false;
      for (const picked of candidates) {
        const code = (perMonth[key].humuTarget - counts[picked.id][key].humu) > 0 ? "휴무" : "휴일";
        const before = next[key][picked.id][day.day - 1];
        const streakBefore = maxStreakOf(picked.id);
        placeRest(key, day, picked.id, code);

        // 이 직원의 연속근무 허용 상한 (고정휴무면 그 요일쌍이 만드는 정상 연속일수까지 허용)
        const limit = fixedRestLimitOf(fixedRestSchedules, dayPairOptions, picked.name, settings);
        const streakAfter = maxStreakOf(picked.id);
        // 상한을 넘더라도 "배정 전보다 나빠지지 않았다면" 허용 (이미 넘긴 상태를 개선하는 중일 수 있음)
        if (streakAfter > limit && streakAfter > streakBefore) {
          next[key][picked.id][day.day - 1] = before; // 되돌리고 다음 후보 시도
          continue;
        }

        if (code === "휴무") counts[picked.id][key].humu++;
        else counts[picked.id][key].hyuil++;
        placedCount[picked.id] = (placedCount[picked.id] || 0) + 1;
        added++;
        placedSomeone = true;
        break;
      }
      if (!placedSomeone) break; // 이 날은 아무도 배정할 수 없음
    }
  });
  };

  runPass();
  // 아직 목표를 못 채운 사람이 있으면 주 3일 허용으로 한 번 더
  if (ftEmps.some((e) => shortOf(e.id).total > 0)) {
    allowThirdRestDay = true;
    runPass();
  }

  // 주 단위 정리: 한 주(월~일) 안에서 쉬는 날이 여러 개면 "가장 앞선 날 = 휴무", 나머지 = 휴일
  // (연차·경조사 등 확정휴무 태그는 건드리지 않고, 휴무/휴일끼리만 서로 바꿈)
  normalizeWeeklyRest(next, ftEmps, monthsMeta);

  // 휴무/휴일로 바뀌면서 그날 출근인원이 줄어든 날짜는 근무조를 다시 배정해야 함.
  // 해당 날짜의 (자동배정 대상 정직원) 근무코드 칸을 비워두면, 이후 2단계를 다시 돌릴 때 새 인원수 기준으로 채워짐.
  let clearedForRebalance = 0;
  changedDays.forEach((tag) => {
    const [key, dayNum] = tag.split("|");
    const idx = Number(dayNum) - 1;
    ftEmps.forEach((e) => {
      const v = next[key][e.id]?.[idx] || "";
      if (v !== "" && workCodeSet.has(v)) {
        next[key][e.id][idx] = "";
        clearedForRebalance++;
      }
    });
  });

  // 배정 후에도 남은 인원 확인 (초과한 달이 부족한 달을 상쇄하지 않도록 부족분만 합산)
  const stillShort = [];
  ftEmps.forEach((e) => {
    let humuShort = 0, hyuilShort = 0;
    monthsMeta.forEach(({ key }) => {
      let humu = 0, hyuil = 0;
      (next[key][e.id] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
      humuShort += Math.max(0, perMonth[key].humuTarget - humu);
      hyuilShort += Math.max(0, perMonth[key].hyuilTarget - hyuil);
    });
    if (humuShort > 0 || hyuilShort > 0) {
      const parts = [];
      if (humuShort > 0) parts.push(`휴무 ${humuShort}일`);
      if (hyuilShort > 0) parts.push(`휴일 ${hyuilShort}일`);
      stillShort.push(`${e.name}(${parts.join(", ")})`);
    }
  });

  let message = `추가로 배정한 휴무/휴일: ${added}건`;
  if (clearedForRebalance > 0) {
    message += ` · 인원이 바뀐 ${changedDays.size}일의 근무조를 비웠습니다 — "2단계: 근무 자동배정"을 한 번 더 눌러 새 인원수에 맞게 채워주세요`;
  }
  if (stillShort.length > 0) {
    message += ` · 자리가 부족해 아직 남은 인원: ${stillShort.join(", ")} — 수기로 조정해주세요`;
  } else {
    message += ` · 모든 정직원의 잔여 휴무/휴일이 0이 되었습니다`;
  }

  return { schedule: next, added, stillShort, changedDayCount: changedDays.size, message };
}

function assignShiftCodes(schedule, employees, tags, settings, ftTemplates, ptTemplates, prefCode, monthsMeta, ftThresholds) {
  const thresholds = ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  const ftAllActive = employees.filter((e) => e.type === "정직원" && isActiveEmployee(e));
  const ptEmps = employees.filter((e) => e.type === "파트타이머" && isActiveEmployee(e));
  const timeline = buildTimeline(monthsMeta);
  const usage = {};
  const getU = (id, code) => usage[id + "|" + code] || 0;
  const incU = (id, code) => { usage[id + "|" + code] = getU(id, code) + 1; };

  let assigned = 0, warn = 0;

  timeline.forEach((slot, idx) => {
    const { key, day } = slot;
    const wd = day.weekday;
    const isHoliday = !!day.holidayName;
    const arr = (empId) => next[key][empId];

    // ---- 정직원 ----
    // 이미 채워진 칸(지원/스위칭 인원이 수기로 입력해둔 경우 포함)은 그날 출근 인원수에 반영하되,
    // 빈 칸을 자동으로 채우는 대상은 "우리매장" 소속(또는 자동배정 켜둔 지원/스위칭)만 해당됨
    const ftEligible = [];
    let ftAlreadyWorking = 0;
    ftAllActive.forEach((e) => {
      const v = arr(e.id)[day.day - 1] || "";
      if (v === "") {
        if (isAutoAssignable(e)) ftEligible.push(e);
      } else if (!isOffTag(tags, v)) {
        ftAlreadyWorking++;
      }
    });

    if (ftEligible.length > 0 && ftTemplates.length > 0) {
      const attendingFT = ftAlreadyWorking + ftEligible.length;
      const weekendB = dowBucket(settings, wd) === "주말" || isHoliday;
      const bucketList = weekendB ? thresholds.weekend : thresholds.weekday;
      const colIdx = pickThresholdIndex(bucketList, attendingFT);
      const needCnt = {};
      ftTemplates.forEach((t) => {
        const countsArr = weekendB ? (t.weCounts || []) : (t.wdCounts || []);
        needCnt[t.code] = Number(countsArr[colIdx]) || 0;
      });
      ftAllActive.forEach((e) => {
        const v = arr(e.id)[day.day - 1] || "";
        if (v === "") return;
        // 반차(오후)/반반차처럼 근무조로 환산되는 태그도 그 조의 필요인원에서 차감
        const asShift = shiftCodeOf(tags, v);
        if (asShift && needCnt[asShift] > 0) needCnt[asShift]--;
      });

      const remaining = new Set(ftEligible.map((e) => e.id));

      if (prefCode && needCnt[prefCode] > 0) {
        while (needCnt[prefCode] > 0) {
          let bestId = null, bestU = Infinity;
          for (const e of ftEligible) {
            if (!remaining.has(e.id)) continue;
            const nextSlot = timeline[idx + 1];
            if (!nextSlot) continue;
            const nv = next[nextSlot.key][e.id][nextSlot.day.day - 1] || "";
            if (!isOffTag(tags, nv)) continue;
            const u = getU(e.id, prefCode);
            if (u < bestU) { bestU = u; bestId = e.id; }
          }
          if (!bestId) break;
          arr(bestId)[day.day - 1] = prefCode;
          incU(bestId, prefCode);
          remaining.delete(bestId);
          needCnt[prefCode]--;
          assigned++;
        }
      }

      for (const t of ftTemplates) {
        while (needCnt[t.code] > 0) {
          let bestId = null, bestU = Infinity;
          for (const e of ftEligible) {
            if (!remaining.has(e.id)) continue;
            const u = getU(e.id, t.code);
            if (u < bestU) { bestU = u; bestId = e.id; }
          }
          if (!bestId) break;
          arr(bestId)[day.day - 1] = t.code;
          incU(bestId, t.code);
          remaining.delete(bestId);
          needCnt[t.code]--;
          assigned++;
        }
      }

      for (const id of remaining) {
        arr(id)[day.day - 1] = ftTemplates[0].code;
        incU(id, ftTemplates[0].code);
        assigned++; warn++;
      }
    }

    // ---- 파트타이머 (개인별로 고정된 근무형태를 그대로 채움 - 형평성 순환 없음) ----
    const extendedToday = isWeekendBucket(settings, day); // 주말/공휴일/(설정에 따라)금요일 등 연장근무 상황
    ptEmps.forEach((e) => {
      if (!e.fixedCode) return; // 근무형태가 지정 안 된 파트타이머는 건드리지 않음
      const isWeekdayPerson = e.dayType === "평일" || e.dayType === "평일전담" || e.dayType === "전체가능";
      const isWeekendPerson = e.dayType === "주말" || e.dayType === "주말전담" || e.dayType === "전체가능";
      const todayIsWeekendCalendar = wd === "토" || wd === "일";
      const dayMatch =
        (isWeekdayPerson && !todayIsWeekendCalendar) ||
        (isWeekendPerson && todayIsWeekendCalendar);
      if (!dayMatch) return;
      const v = arr(e.id)[day.day - 1] || "";
      if (v !== "") return; // 이미 채워진 칸은 건드리지 않음
      const code = extendedToday && e.extendedCode ? e.extendedCode : e.fixedCode;
      arr(e.id)[day.day - 1] = code;
      assigned++;
    });
  });

  let msg = `새로 배정한 근무 칸: ${assigned}건`;
  if (warn > 0) msg += ` (템플릿 인원수 부족으로 기본코드 채움: ${warn}건 — 근무형태템플릿을 확인하세요)`;
  return { schedule: next, assigned, warn, message: msg };
}

/* ============================================================
   검증
   ============================================================ */
// 이 직원의 연속근무 허용 상한을 구한다.
// 고정휴무 직원이면 그 요일쌍 패턴이 만들어내는 연속근무일수(예: 월화 휴무 → 수~일 5근)를 상한으로 삼고,
// 그렇지 않으면 설정의 연속근무 최대 허용값을 쓴다.
function fixedRestLimitOf(fixedRestSchedules, dayPairOptions, empName, settings) {
  const base = Number(settings?.consecMax) || 99;
  const entry = (fixedRestSchedules || []).find(
    (f) => (f.empNames || []).includes(empName) && lookupDayPair(dayPairOptions, f.dayPair)
  );
  if (!entry) return base;
  const wds = lookupDayPair(dayPairOptions, entry.dayPair) || [];
  if (wds.length === 0) return base;
  // 한 주(7일) 중 쉬는 날을 뺀 나머지가 연속으로 이어질 수 있는 최대치
  const patternMax = 7 - wds.length;
  return Math.max(base, patternMax);
}

function validateMonth(schedule, employees, tags, settings, days, key, fixedRestSchedules, dayPairOptions) {
  let notOkDates = [];
  days.forEach((day) => {
    let ftAttend = 0, ptAttend = 0;
    employees.forEach((e) => {
      if (!isActiveEmployee(e)) return;
      const v = schedule[key][e.id][day.day - 1] || "";
      const attend = v !== "" && !isOffTag(tags, v);
      if (e.type === "정직원" && attend) ftAttend++;
      if (e.type === "파트타이머" && attend) ptAttend++;
    });
    const ftReq = requiredFT(settings, day);
    const ptReq = requiredPT(settings, day);
    if (ftAttend < ftReq || ptAttend < ptReq) notOkDates.push(`${day.day}일`);
  });

  const warnList = [];
  employees.filter((e) => e.type === "정직원" && isActiveEmployee(e)).forEach((e) => {
    // 고정휴무 직원은 요일쌍 패턴이 만드는 연속근무(예: 월화 휴무 → 수~일 5근)까지는 정상으로 보고,
    // 그보다 더 길어진 경우에만 경고 (고정휴무 매장에서도 6근 이상은 잡아냄)
    const limit = fixedRestLimitOf(fixedRestSchedules, dayPairOptions, e.name, settings);
    let consec = 0, maxRun = 0;
    days.forEach((day) => {
      const v = schedule[key][e.id][day.day - 1] || "";
      if (isOffTag(tags, v)) consec = 0;
      else { consec++; if (consec > maxRun) maxRun = consec; }
    });
    if (maxRun > limit) warnList.push(`${e.name}(최대연속 ${maxRun}일)`);
  });

  return { notOkCount: notOkDates.length, notOkDates, warnList };
}

function validateCombined(schedule, employees, tags, settings, monthsMeta, fixedRestSchedules, dayPairOptions) {
  const warnList = [];
  employees.filter((e) => e.type === "정직원" && isActiveEmployee(e)).forEach((e) => {
    const limit = fixedRestLimitOf(fixedRestSchedules, dayPairOptions, e.name, settings);
    let consec = 0, maxRun = 0;
    monthsMeta.forEach(({ key, days }) => {
      days.forEach((day) => {
        const v = schedule[key][e.id][day.day - 1] || "";
        if (isOffTag(tags, v)) consec = 0;
        else { consec++; if (consec > maxRun) maxRun = consec; }
      });
    });
    if (maxRun > limit) warnList.push(`${e.name}(2개월 연속 최대 ${maxRun}일)`);
  });
  return warnList;
}

/* ============================================================
   연차 사용 현황 - 태그의 trackAsLeave/leaveHours를 기준으로,
   현재 진행중인 스케줄(1·2개월차)과 저장된 월별기록(archive)을 합쳐서
   그 해(year) 동안 각 직원이 어떤 태그를 언제 썼는지 자동 집계
   ============================================================ */
function computeLeaveUsage(year, tags, archive) {
  const leaveTags = tags.filter((t) => t.trackAsLeave);
  const leaveTagCodes = new Set(leaveTags.map((t) => t.code));

  // 오직 [월별기록]에 "저장"된 데이터만 기준으로 계산 (진행중인 스케줄을 지우거나 수정해도 영향받지 않음)
  const result = {}; // empId -> { name, byPool: { poolName: { totalHours, byTag: { code: { hours, dates: [] } } } } }
  const yearPrefix = String(year) + "-";

  Object.keys(archive || {}).forEach((monthKey) => {
    if (!monthKey.startsWith(yearPrefix)) return;
    const ent = archive[monthKey];
    if (!ent) return;
    const days = ent.days || [];
    const employeesList = ent.employeesSnapshot || [];
    const scheduleByEmp = ent.schedule || {};

    employeesList.forEach((e) => {
      const arr = scheduleByEmp[e.id];
      if (!arr) return;
      days.forEach((day, i) => {
        const v = arr[i];
        if (!v || !leaveTagCodes.has(v)) return;
        const tag = leaveTags.find((t) => t.code === v);
        const pool = tag.leavePool || "연차";
        if (!result[e.id]) result[e.id] = { name: e.name, byPool: {} };
        if (!result[e.id].byPool[pool]) result[e.id].byPool[pool] = { totalHours: 0, byTag: {} };
        const poolEntry = result[e.id].byPool[pool];
        if (!poolEntry.byTag[v]) poolEntry.byTag[v] = { hours: Number(tag.leaveHours) || 0, dates: [] };
        poolEntry.byTag[v].dates.push(day.dateStr);
        poolEntry.totalHours += Number(tag.leaveHours) || 0;
      });
    });
  });

  // 날짜 순 정렬
  Object.values(result).forEach((r) => {
    Object.values(r.byPool).forEach((pool) => {
      Object.values(pool.byTag).forEach((b) => b.dates.sort());
    });
  });

  return result;
}

export {
  WEEKDAYS, DOW_OPTIONS,
  DEFAULT_TAGS, DEFAULT_EMPLOYEES, DEFAULT_HOLIDAYS, DEFAULT_FT_TEMPLATES, DEFAULT_PT_TEMPLATES,
  defaultSettings, defaultStoreData, reconcileSchedule, normalizeFtTemplates,
  buildMonthDays, applyPersonalTags, convertRequestTags, assignRestDays, assignShiftCodes, assignRemainingRest, finalAdjust,
  applyFixedRestSchedules, isFixedRestCovered, isFixedRestEmployee, resolveFixedRestEnd, DEFAULT_DAY_PAIR_OPTIONS,
  emptyMemoRows, reconcileMemoRows,
  validateMonth, validateCombined, satTarget, sunHolTarget, requiredFT, requiredPT,
  isOffTag, shiftCodeOf, dowBucket, nextMonth, emptySchedule, isWeekendBucket, isActiveEmployee, pickThresholdIndex, isAutoAssignable,
  computeLeaveUsage,
};
