const DEFAULT_TAGS = [
  { code: "A", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { code: "B", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { code: "C", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { code: "A/F", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { code: "B/F", category: "근무코드", countsAsAttend: true, restType: "해당없음", desc: "기본 근무코드" },
  { code: "휴무", category: "확정휴무", countsAsAttend: false, restType: "휴무", desc: "주 1회 필수 휴무" },
  { code: "휴일", category: "확정휴무", countsAsAttend: false, restType: "휴일", desc: "휴무 다음으로 배정되는 휴식일" },
  { code: "연차", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "개인 연차" },
  { code: "반차(오전)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오전 반차" },
  { code: "반차(오후)", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "오후 반차" },
  { code: "반반차", category: "조정", countsAsAttend: false, restType: "해당없음", desc: "반반차" },
  { code: "경조사", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "경조사 휴가" },
  { code: "예비군", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "예비군 훈련" },
  { code: "지원근무", category: "확정근무", countsAsAttend: false, restType: "해당없음", desc: "타매장 지원 (본 매장 인원에서 제외)" },
  { code: "교육", category: "확정근무", countsAsAttend: true, restType: "해당없음", desc: "사내 교육" },
  { code: "PT입사", category: "확정근무", countsAsAttend: true, restType: "해당없음", desc: "신규 PT 입사/교육" },
  { code: "민방위", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "민방위 훈련" },
  { code: "RQ", category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "개인 요청 휴무" },
];

const DEFAULT_EMPLOYEES = [
  { id: "e1", name: "직원1", type: "정직원", status: "재직" },
  { id: "e2", name: "직원2", type: "정직원", status: "재직" },
];

const DEFAULT_HOLIDAYS_2026 = [
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
  const now = new Date();
  return {
    storeName: "새 매장",
    year: now.getFullYear(),
    startMonth: now.getMonth() + 1,
    weekdayMinFT: 2, weekdayMinPT: 1,
    weekendMinFT: 3, weekendMinPT: 1,
    consecRecommended: 3, consecMax: 4,
    dow: { 월: "평일", 화: "평일", 수: "평일", 목: "평일", 금: "평일(소프트-주말수준)", 토: "주말", 일: "주말" },
  };
}

function defaultStoreConfig() {
  return {
    settings: defaultSettings(),
    employees: DEFAULT_EMPLOYEES,
    tags: DEFAULT_TAGS,
    holidays: DEFAULT_HOLIDAYS_2026,
    issueDays: [],
    personalTags: [],
    ftTemplates: DEFAULT_FT_TEMPLATES,
    ptTemplates: DEFAULT_PT_TEMPLATES,
    prefCode: "A",
  };
}

module.exports = { defaultStoreConfig };
