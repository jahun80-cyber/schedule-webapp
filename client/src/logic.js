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
  { id: "tag_default_8", code: "연차", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "개인 연차" },
  { id: "tag_default_9", code: "반차(오전)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오전 반차" },
  { id: "tag_default_10", code: "반차(오후)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오후 반차" },
  { id: "tag_default_11", code: "반반차", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "반반차" },
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
  { code: "A", start: "09:30", end: "19:00", wd2: "", wd3: 1, wd4: 2, we2: "", we3: 1, we4: 2 },
  { code: "B", start: "10:30", end: "20:00", wd2: "", wd3: 2, wd4: 2, we2: "", we3: "", we4: "" },
  { code: "C", start: "11:00", end: "20:30", wd2: "", wd3: "", wd4: "", we2: "", we3: 2, we4: 2 },
  { code: "A/F", start: "10:00", end: "20:00", wd2: 2, wd3: "", wd4: "", we2: "", we3: "", we4: "" },
  { code: "B/F", start: "10:00", end: "20:30", wd2: "", wd3: "", wd4: "", we2: 2, we3: "", we4: "" },
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

function emptySchedule(employees, days1, days2) {
  const sched = { m1: {}, m2: {} };
  employees.forEach((e) => {
    sched.m1[e.id] = Array(days1.length).fill("");
    sched.m2[e.id] = Array(days2.length).fill("");
  });
  return sched;
}

// 기존 스케줄을 새 달력 길이에 맞춰 보존 이관 (직원 추가/월 변경 대응)
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

/* ============================================================
   핵심: 휴무/휴일 자동배정 (하루씩 순서대로 훑는 엔진)
   ============================================================ */
function applyPersonalTags(schedule, employees, personalTags, monthsMeta) {
  let applied = 0;
  const next = { m1: { ...schedule.m1 }, m2: { ...schedule.m2 } };
  Object.keys(next.m1).forEach((id) => (next.m1[id] = [...schedule.m1[id]]));
  Object.keys(next.m2).forEach((id) => (next.m2[id] = [...schedule.m2[id]]));

  for (const pt of personalTags) {
    if (!pt.start || !pt.end || !pt.empName || !pt.tagCode) continue;
    const emp = employees.find((e) => e.name === pt.empName);
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
  return { schedule: next, applied };
}

function buildTimeline(monthsMeta) {
  const timeline = [];
  monthsMeta.forEach(({ key, days }) => {
    days.forEach((day) => timeline.push({ key, day }));
  });
  return timeline;
}

function assignRestDays(schedule, employees, tags, settings, monthsMeta) {
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

    // 1단계: 급한 사람(연속 3일+) - 소프트 한도
    while (true) {
      let bestId = null, bestStreak = -1;
      ftEmps.forEach((e) => {
        if (isBlank[e.id] && !selected.has(e.id) && streak[e.id] >= 3 && streak[e.id] > bestStreak) {
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
        if (isBlank[e.id] && !selected.has(e.id) && streak[e.id] >= 3 && streak[e.id] > bestStreak) {
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
        if (isBlank[e.id] && !selected.has(e.id) && streak[e.id] >= 1 && restCount[e.id] < bestRest) {
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

function assignShiftCodes(schedule, employees, tags, settings, ftTemplates, ptTemplates, prefCode, monthsMeta, ftThresholds) {
  const thresholds = ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
  const wdFields = ["wd2", "wd3", "wd4"];
  const weFields = ["we2", "we3", "we4"];
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
      const fieldList = weekendB ? weFields : wdFields;
      const chosenField = fieldList[pickThresholdIndex(bucketList, attendingFT)];
      const needCnt = {};
      ftTemplates.forEach((t) => {
        needCnt[t.code] = Number(t[chosenField]) || 0;
      });
      ftAllActive.forEach((e) => {
        const v = arr(e.id)[day.day - 1] || "";
        if (v !== "" && !isOffTag(tags, v) && needCnt[v] > 0) needCnt[v]--;
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
function validateMonth(schedule, employees, tags, settings, days, key) {
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
    let consec = 0, maxRun = 0;
    days.forEach((day) => {
      const v = schedule[key][e.id][day.day - 1] || "";
      if (isOffTag(tags, v)) consec = 0;
      else { consec++; if (consec > maxRun) maxRun = consec; }
    });
    if (maxRun > settings.consecMax) warnList.push(`${e.name}(최대연속 ${maxRun}일)`);
  });

  return { notOkCount: notOkDates.length, notOkDates, warnList };
}

function validateCombined(schedule, employees, tags, settings, monthsMeta) {
  const warnList = [];
  employees.filter((e) => e.type === "정직원" && isActiveEmployee(e)).forEach((e) => {
    let consec = 0, maxRun = 0;
    monthsMeta.forEach(({ key, days }) => {
      days.forEach((day) => {
        const v = schedule[key][e.id][day.day - 1] || "";
        if (isOffTag(tags, v)) consec = 0;
        else { consec++; if (consec > maxRun) maxRun = consec; }
      });
    });
    if (maxRun > settings.consecMax) warnList.push(`${e.name}(2개월 연속 최대 ${maxRun}일)`);
  });
  return warnList;
}

export {
  WEEKDAYS, DOW_OPTIONS,
  DEFAULT_TAGS, DEFAULT_EMPLOYEES, DEFAULT_HOLIDAYS, DEFAULT_FT_TEMPLATES, DEFAULT_PT_TEMPLATES,
  defaultSettings, defaultStoreData, reconcileSchedule,
  buildMonthDays, applyPersonalTags, assignRestDays, assignShiftCodes,
  validateMonth, validateCombined, satTarget, sunHolTarget, requiredFT, requiredPT,
  isOffTag, dowBucket, nextMonth, emptySchedule, isWeekendBucket, isActiveEmployee, pickThresholdIndex, isAutoAssignable,
};
