import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Settings, Users, Tag, CalendarDays, ClipboardList, CheckCircle2,
  PlayCircle, Plus, Trash2, Store, Loader2, AlertTriangle,
  Sparkles, Save, ClipboardCheck, LogOut, Lock, Download, Upload, Archive,
  FileSpreadsheet, Copy, PieChart, History, FolderCog, FolderCheck, HardDriveDownload,
} from "lucide-react";
import { api, getPassword, setPassword, clearPassword, getRole, setRole } from "./api";
import {
  WEEKDAYS, DOW_OPTIONS,
  defaultStoreData,
  buildMonthDays, applyPersonalTags, convertRequestTags, assignRestDays, assignShiftCodes,
  applyFixedRestSchedules, assignRemainingRest, finalAdjust, normalizeFtTemplates, normalizeEmployeeRestModes, DEFAULT_DAY_PAIR_OPTIONS,
  emptyMemoRows, reconcileMemoRows,
  validateMonth, validateCombined, satTarget, sunHolTarget, requiredFT, requiredPT, requiredLeaderFT,
  isOffTag, dowBucket, nextMonth, emptySchedule, reconcileSchedule, isActiveEmployee, isAutoAssignable, computeLeaveUsage,
  isUnderContractOn, isCountedOn, restTargetFor,
} from "./logic";
import {
  saveDirHandle, loadDirHandle, clearDirHandle, isFileSystemAccessSupported, ensurePermission,
} from "./lib/xlsxDirHandle";
import {
  fillWorkbook, readWorkbook, workbookToArrayBuffer, outputFileName,
} from "./lib/shifteeFile";

/* ============================================================
   작은 UI 조각들
   ============================================================ */
function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1 mb-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function NumberInput({ value, onChange, min = 0, className = "" }) {
  return (
    <input
      type="number" min={min} value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={`border border-slate-300 rounded-md px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    />
  );
}

function TextInput({ value, onChange, placeholder = "", className = "" }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    />
  );
}

function DateInput({ value, onChange, className = "" }) {
  return (
    <input
      type="date" value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    />
  );
}

// 고정휴무처럼 "몇년 몇월 ~ 몇년 몇월"만 정하면 되는 경우용 - 실제로는 그달 1일 / 그달 마지막날로 자동 변환됨
function monthOf(dateStr) { return dateStr ? dateStr.slice(0, 7) : ""; }
function monthToStart(ym) { return ym ? `${ym}-01` : ""; }
function monthToEnd(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${ym}-${String(lastDay).padStart(2, "0")}`;
}
function MonthInput({ value, onChange, className = "" }) {
  return (
    <input
      type="month" value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    />
  );
}

// 스케줄 메모 줄용 - 내용을 입력하는 만큼 세로로 자동으로 늘어나는 텍스트박스
function AutoGrowTextarea({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className="w-full text-[9px] text-center border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 py-1 resize-none overflow-hidden leading-tight"
      style={{ minHeight: "20px" }}
    />
  );
}

function Select({ value, onChange, options, className = "" }) {
  const normOptions = options.map((o) => ({ value: o?.value ?? o, label: o?.label ?? o }));
  // eslint-disable-next-line eqeqeq
  const hasMatch = normOptions.some((o) => o.value == value);
  // 저장된 값이 옵션 목록 어디에도 없으면(예: 예전 데이터에 값이 아예 비어있는 경우) 브라우저가
  // 조용히 첫 번째 옵션을 대신 보여줘서 "정상 선택된 것처럼" 착각하게 만든다 - 그걸 막기 위해
  // 그런 경우엔 눈에 띄는 빨간 "⚠ 선택 안 됨" 자리표시자를 보여주고, 실제 옵션 중 하나를 골라야
  // 그제서야 값이 저장되게 한다.
  return (
    <select
      value={hasMatch ? value : "__unset__"} onChange={(e) => onChange(e.target.value)}
      className={`border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 ${hasMatch ? "border-slate-300" : "border-red-400 text-red-600 font-semibold"} ${className}`}
    >
      {!hasMatch && <option value="__unset__" disabled>⚠ 선택 안 됨</option>}
      {normOptions.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function IconBtn({ onClick, title, danger }) {
  return (
    <button
      onClick={onClick} title={title}
      className={`p-1.5 rounded-md hover:bg-red-50 ${danger ? "text-red-500" : "text-slate-400"}`}
    >
      <Trash2 size={15} />
    </button>
  );
}

function PrimaryBtn({ onClick, children, disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
    >
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}

function GhostBtn({ onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
    >
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}

// 권한이 없어 이 화면(또는 이 화면의 일부)을 수정할 수 없을 때 보여주는 안내문
function ReadOnlyNotice({ children }) {
  return (
    <div className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-3 py-2">
      {children}
    </div>
  );
}

// 자식 요소를 통째로 읽기 전용으로 만든다. IconBtn/GhostBtn/TextInput/NumberInput/Select 등이
// 전부 순수 button/input/select라서, fieldset으로 감싸면 안의 모든 입력·버튼이 자동으로 비활성화된다.
// (display:contents는 크로미움에서 fieldset[disabled] 상속을 깨뜨리는 버그가 있어 쓰지 않는다 -
//  대신 기본 여백/테두리만 지우고 block으로 그대로 둔다. 여기 감싸는 곳은 전부 세로로 쌓이는
//  일반 블록 레이아웃이라 flex/grid 자식 개수에 영향 없음.)
function ReadOnlyFence({ locked, children }) {
  return (
    <fieldset disabled={locked} className="border-0 m-0 p-0 min-w-0">
      {children}
    </fieldset>
  );
}

function SectionCard({ title, icon: Icon, children, right }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-indigo-600" />}
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   로그인 화면
   ============================================================ */
function LoginScreen({ onLoggedIn }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      setPassword(pw);
      const res = await api.login(pw);
      setRole(res.role);
      onLoggedIn(res.role);
    } catch (e) {
      clearPassword();
      setErr(e.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <Store className="text-indigo-600" size={22} />
          <h1 className="text-lg font-bold text-slate-800">매장 스케줄링</h1>
        </div>
        <p className="text-xs text-slate-500 mb-6">비밀번호를 입력하면 접속됩니다.</p>
        <div className="relative mb-3">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호"
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
        </div>
        {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null} 접속하기
        </button>
      </form>
    </div>
  );
}

/* ============================================================
   설정 탭
   ============================================================ */
function SettingsTab({ data, setData, role }) {
  const locked = role === "viewer";
  const s = data.settings;
  const dayPairOptions = data.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS;
  const update = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const updateDow = (wd, val) => setData((d) => ({ ...d, settings: { ...d.settings, dow: { ...d.settings.dow, [wd]: val } } }));

  const updDayPair = (i, patch) => setData((d) => {
    const opts = [...(d.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS)];
    opts[i] = { ...opts[i], ...patch };
    return { ...d, dayPairOptions: opts };
  });
  const rmDayPair = (i) => setData((d) => ({
    ...d, dayPairOptions: (d.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS).filter((_, idx) => idx !== i),
  }));
  const addDayPair = () => setData((d) => ({
    ...d,
    dayPairOptions: [...(d.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS), { id: "dp_" + Date.now(), label: "새구분", weekdays: [] }],
  }));
  const toggleDayPairWeekday = (i, wd) => setData((d) => {
    const opts = [...(d.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS)];
    const cur = opts[i].weekdays || [];
    opts[i] = { ...opts[i], weekdays: cur.includes(wd) ? cur.filter((x) => x !== wd) : [...cur, wd] };
    return { ...d, dayPairOptions: opts };
  });

  return (
    <div className="max-w-4xl">
      {locked && <ReadOnlyNotice>이 화면은 열람만 가능합니다. 변경이 필요하면 매장관리자 이상에게 요청하세요.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard title="기본 정보" icon={Store}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="매장명"><TextInput value={s.storeName} onChange={(v) => update({ storeName: v })} /></Field>
          <Field label="기준연도"><NumberInput value={s.year} onChange={(v) => update({ year: v })} /></Field>
          <Field label="시작월 (1개월차)"><NumberInput value={s.startMonth} onChange={(v) => update({ startMonth: v })} min={1} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="인원 최소 출근 기준" icon={Users}>
        <div className="grid grid-cols-4 gap-4">
          <Field label="평일 최소 - 정직원"><NumberInput value={s.weekdayMinFT} onChange={(v) => update({ weekdayMinFT: v })} /></Field>
          <Field label="평일 최소 - PT"><NumberInput value={s.weekdayMinPT} onChange={(v) => update({ weekdayMinPT: v })} /></Field>
          <Field label="주말/공휴일 최소 - 정직원"><NumberInput value={s.weekendMinFT} onChange={(v) => update({ weekendMinFT: v })} /></Field>
          <Field label="주말/공휴일 최소 - PT"><NumberInput value={s.weekendMinPT} onChange={(v) => update({ weekendMinPT: v })} /></Field>
        </div>
        <label className="flex items-center gap-2 mt-4 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox" className="w-4 h-4 accent-indigo-600"
            checked={!!s.leaderMinEnabled}
            onChange={(ev) => update({ leaderMinEnabled: ev.target.checked })}
          />
          직책별(리더) 최소인원 사용
        </label>
        {s.leaderMinEnabled && (
          <div className="grid grid-cols-4 gap-4 mt-3">
            <Field label="평일 최소 - 리더"><NumberInput value={s.weekdayMinLeader} onChange={(v) => update({ weekdayMinLeader: v })} /></Field>
            <Field label="주말/공휴일 최소 - 리더"><NumberInput value={s.weekendMinLeader} onChange={(v) => update({ weekendMinLeader: v })} /></Field>
          </div>
        )}
        {s.leaderMinEnabled && (
          <p className="text-[11px] text-slate-400 mt-2">
            [직원목록]에서 "리더"로 지정한 정직원이 매일 이 인원수 이상 출근하도록 자동배정이 반영합니다. 리더가 아닌 인원은 영향 없습니다.
          </p>
        )}
      </SectionCard>

      <SectionCard title="휴무 배정 - 매장 기본값" icon={AlertTriangle}>
        <p className="text-xs text-slate-500 mb-3">
          이제 휴무 배정 방식(로테이션/고정휴무)은 [직원목록]에서 인원별로 지정합니다. 여기 값은 "로테이션"으로 지정한 인원이
          개인별 값을 따로 입력하지 않았을 때 쓰이는 매장 공통 기본값입니다.
        </p>
        <div className="grid grid-cols-4 gap-4">
          <Field label="연속근무 권장 상한(일)"><NumberInput value={s.consecRecommended} onChange={(v) => update({ consecRecommended: v })} /></Field>
          <Field label="연속근무 최대 허용(일)"><NumberInput value={s.consecMax} onChange={(v) => update({ consecMax: v })} /></Field>
        </div>

        <div className="flex items-center justify-between mb-2 mt-5">
          <span className="text-xs font-semibold text-slate-600">요일쌍(구분) 목록 — 고정휴무 인원이 쓸 수 있는 요일쌍 정의</span>
          <GhostBtn onClick={addDayPair} icon={Plus}>구분 추가</GhostBtn>
        </div>
        <div className="space-y-2">
          {dayPairOptions.map((p, i) => (
            <div key={p.id || i} className="flex items-center gap-2 flex-wrap border border-slate-200 rounded-md px-3 py-2">
              <TextInput value={p.label} onChange={(v) => updDayPair(i, { label: v })} className="w-20" />
              <div className="flex items-center gap-1">
                {WEEKDAYS.map((wd) => (
                  <label key={wd} className={`text-[11px] px-2 py-1 rounded cursor-pointer select-none ${(p.weekdays || []).includes(wd) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <input type="checkbox" className="hidden" checked={(p.weekdays || []).includes(wd)} onChange={() => toggleDayPairWeekday(i, wd)} />
                    {wd}
                  </label>
                ))}
              </div>
              <IconBtn onClick={() => rmDayPair(i)} title="삭제" danger />
            </div>
          ))}
          {dayPairOptions.length === 0 && <p className="text-xs text-slate-400">등록된 구분이 없습니다.</p>}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          체크한 요일 중 첫번째가 휴무, 나머지가 휴일로 채워집니다. 실제로 누가 어떤 요일쌍을 쓰는지는
          [직원목록]에서 "고정휴무"로 지정한 뒤 [공휴일·이슈일] 탭의 "고정휴무 설정"에서 지정합니다.
        </p>
      </SectionCard>

      <SectionCard title="요일 구분 설정" icon={CalendarDays}>
        <p className="text-xs text-slate-500 mb-3">백화점 채널처럼 금·토·일이 주말인 경우 여기서 직접 바꾸세요.</p>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-600 text-center">{wd}</span>
              <Select value={s.dow[wd]} onChange={(v) => updateDow(wd, v)} options={DOW_OPTIONS} className="text-[11px] px-1" />
            </div>
          ))}
        </div>
      </SectionCard>
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   직원목록 탭
   ============================================================ */
function EmployeesTab({ data, setData, role }) {
  const locked = role === "viewer";
  const emps = data.employees;
  const ptCodeOptions = ["", ...data.ptTemplates.map((t) => t.code)];
  const update = (id, patch) => setData((d) => ({ ...d, employees: d.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const remove = (id) => setData((d) => ({ ...d, employees: d.employees.filter((e) => e.id !== id) }));
  const addFT = () => setData((d) => ({ ...d, employees: [...d.employees, { id: "e" + Date.now(), name: "", type: "정직원", memberType: "우리매장", autoAssign: false, status: "재직" }] }));
  const addPT = () => setData((d) => ({
    ...d,
    employees: [...d.employees, {
      id: "e" + Date.now(), name: "", type: "파트타이머",
      fixedCode: d.ptTemplates[0]?.code || "", extendedCode: "", dayType: "평일", status: "재직",
    }],
  }));

  const ftList = emps.filter((e) => e.type === "정직원");
  const ptList = emps.filter((e) => e.type === "파트타이머");

  return (
    <div className="max-w-5xl">
      {locked && <ReadOnlyNotice>이 화면은 열람만 가능합니다. 변경이 필요하면 매장관리자 이상에게 요청하세요.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard title="정직원" icon={Users} right={<GhostBtn onClick={addFT} icon={Plus}>정직원 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          소속을 "지원근무"나 "스위칭근무"로 두면 휴무/휴일·근무 자동배정에서 제외되고, 스케줄 화면에서 수기로만 입력됩니다.
          "자동배정 포함"을 켜면 예외적으로 우리매장 인원처럼 자동배정 대상에 포함시킬 수 있습니다.
          "휴무방식"이 로테이션이면 같은 행에서 개인별 연속근무 상한을 지정할 수 있고(비우면 매장 기본값), 고정휴무면
          [공휴일·이슈일]의 "고정휴무 설정"에서 요일쌍을 지정합니다. 직책을 "인턴"으로 두면 계약기간·목표를 아래 추가 줄에서 지정할 수 있습니다.
        </p>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 font-semibold">이름</th>
              <th className="py-2 font-semibold">사원번호</th>
              <th className="py-2 font-semibold">소속</th>
              <th className="py-2 font-semibold">자동배정 포함</th>
              <th className="py-2 font-semibold">직책</th>
              <th className="py-2 font-semibold">휴무방식</th>
              <th className="py-2 font-semibold">연속근무 권장</th>
              <th className="py-2 font-semibold">연속근무 최대</th>
              <th className="py-2 font-semibold">재직상태</th>
              <th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {ftList.map((e) => {
              const memberType = e.memberType || "우리매장";
              const isGuest = memberType !== "우리매장";
              const restMode = e.restMode || "로테이션";
              const isIntern = e.role === "인턴";
              return (
                <React.Fragment key={e.id}>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-2"><TextInput value={e.name} onChange={(v) => update(e.id, { name: v })} className="w-40" /></td>
                  <td className="py-1.5 pr-2"><TextInput value={e.empNo || ""} onChange={(v) => update(e.id, { empNo: v })} className="w-28" placeholder="예: I501193" /></td>
                  <td className="py-1.5 pr-2">
                    <Select value={memberType} onChange={(v) => update(e.id, { memberType: v })} options={["우리매장", "지원근무", "스위칭근무"]} />
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    {isGuest ? (
                      <input
                        type="checkbox" checked={!!e.autoAssign}
                        onChange={(ev) => update(e.id, { autoAssign: ev.target.checked })}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-300">해당없음</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    <Select value={e.role || "직원"} onChange={(v) => update(e.id, { role: v })} options={["리더", "직원", "인턴"]} className="w-20" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Select value={restMode} onChange={(v) => update(e.id, { restMode: v })} options={["로테이션", "고정휴무"]} className="w-24" />
                  </td>
                  <td className="py-1.5 pr-2">
                    {restMode === "로테이션" ? (
                      <NumberInput value={e.consecRecommended ?? ""} onChange={(v) => update(e.id, { consecRecommended: v })} className="w-16" placeholder="기본값" />
                    ) : (
                      <span className="text-[11px] text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    {restMode === "로테이션" ? (
                      <NumberInput value={e.consecMax ?? ""} onChange={(v) => update(e.id, { consecMax: v })} className="w-16" placeholder="기본값" />
                    ) : (
                      <span className="text-[11px] text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2"><Select value={e.status} onChange={(v) => update(e.id, { status: v })} options={["재직", "퇴직예정", "퇴직"]} /></td>
                  <td><IconBtn onClick={() => remove(e.id)} title="삭제" danger /></td>
                </tr>
                {isIntern && (
                  <tr className="border-b border-slate-100 bg-amber-50/40">
                    <td colSpan={10} className="py-2 px-2">
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        <span className="font-semibold text-amber-700">인턴 계약</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">계약기간</span>
                          <DateInput value={e.contractStart || ""} onChange={(v) => update(e.id, { contractStart: v })} />
                          <span className="text-slate-400">~</span>
                          <DateInput value={e.contractEnd || ""} onChange={(v) => update(e.id, { contractEnd: v })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">출근인원 1로 계산 시작일</span>
                          <DateInput value={e.fullCountFrom || ""} onChange={(v) => update(e.id, { fullCountFrom: v })} />
                          <span className="text-[10px] text-slate-400">(비우면 처음부터 1로 계산)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">1개월차 목표(휴무/휴일)</span>
                          <NumberInput value={e.restTargetM1?.humu ?? ""} onChange={(v) => update(e.id, { restTargetM1: { ...(e.restTargetM1 || {}), humu: v } })} className="w-14" placeholder="자동" />
                          <NumberInput value={e.restTargetM1?.hyuil ?? ""} onChange={(v) => update(e.id, { restTargetM1: { ...(e.restTargetM1 || {}), hyuil: v } })} className="w-14" placeholder="자동" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">2개월차 목표(휴무/휴일)</span>
                          <NumberInput value={e.restTargetM2?.humu ?? ""} onChange={(v) => update(e.id, { restTargetM2: { ...(e.restTargetM2 || {}), humu: v } })} className="w-14" placeholder="자동" />
                          <NumberInput value={e.restTargetM2?.hyuil ?? ""} onChange={(v) => update(e.id, { restTargetM2: { ...(e.restTargetM2 || {}), hyuil: v } })} className="w-14" placeholder="자동" />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </SectionCard>

      <SectionCard title="파트타이머" icon={Users} right={<GhostBtn onClick={addPT} icon={Plus}>파트타이머 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          기본근무형태는 평소 근무하는 코드, 연장근무형태는 그날이 "주말/공휴일"(설정에 따라 금요일 포함)로 판정될 때 대신 쓰일 코드입니다.
          연장근무형태를 비워두면 항상 기본근무형태 그대로 채워집니다.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 font-semibold">이름</th>
              <th className="py-2 font-semibold">사원번호</th>
              <th className="py-2 font-semibold">기본근무형태</th>
              <th className="py-2 font-semibold">연장근무형태</th>
              <th className="py-2 font-semibold">근무요일구분</th>
              <th className="py-2 font-semibold">재직상태</th>
              <th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {ptList.map((e) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="py-1.5 pr-2"><TextInput value={e.name} onChange={(v) => update(e.id, { name: v })} className="w-32" /></td>
                <td className="py-1.5 pr-2"><TextInput value={e.empNo || ""} onChange={(v) => update(e.id, { empNo: v })} className="w-24" placeholder="예: P260161" /></td>
                <td className="py-1.5 pr-2"><Select value={e.fixedCode || ""} onChange={(v) => update(e.id, { fixedCode: v })} options={ptCodeOptions} className="w-24" /></td>
                <td className="py-1.5 pr-2"><Select value={e.extendedCode || ""} onChange={(v) => update(e.id, { extendedCode: v })} options={ptCodeOptions} className="w-24" /></td>
                <td className="py-1.5 pr-2"><Select value={e.dayType} onChange={(v) => update(e.id, { dayType: v })} options={["평일", "주말"]} /></td>
                <td className="py-1.5 pr-2"><Select value={e.status} onChange={(v) => update(e.id, { status: v })} options={["재직", "퇴직예정", "퇴직"]} /></td>
                <td><IconBtn onClick={() => remove(e.id)} title="삭제" danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   태그목록 탭
   ============================================================ */
function TagsTab({ data, setData, role }) {
  const locked = role !== "admin"; // 태그목록은 총관리자만 수정 가능
  const tags = data.tags;

  // 예전 데이터에 id가 없는 태그가 있으면 한 번만 안정적인 id를 부여 (코드 입력 중 커서가 사라지는 문제 방지)
  useEffect(() => {
    if (data.tags.some((t) => !t.id)) {
      setData((d) => ({
        ...d,
        tags: d.tags.map((t, i) => (t.id ? t : { ...t, id: `tag_${Date.now()}_${i}` })),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (id, patch) => setData((d) => ({ ...d, tags: d.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const remove = (id) => setData((d) => ({ ...d, tags: d.tags.filter((t) => t.id !== id) }));
  const add = () => setData((d) => ({
    ...d,
    tags: [...d.tags, { id: `tag_${Date.now()}`, code: "새태그" + (d.tags.length + 1), category: "확정휴무", countsAsAttend: false, restType: "해당없음", desc: "" }],
  }));

  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  const onDragStart = (i) => { dragIndex.current = i; };
  const onDragOver = (e, i) => { e.preventDefault(); setOverIndex(i); };
  const onDrop = (i) => {
    const from = dragIndex.current;
    if (from === null || from === i) { setOverIndex(null); return; }
    setData((d) => {
      const arr = [...d.tags];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      return { ...d, tags: arr };
    });
    dragIndex.current = null;
    setOverIndex(null);
  };
  const onDragEnd = () => { dragIndex.current = null; setOverIndex(null); };

  return (
    <div className="max-w-5xl">
      {locked && <ReadOnlyNotice>태그목록은 총관리자만 수정할 수 있습니다. 변경이 필요하면 총관리자에게 요청하세요.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard title="태그목록" icon={Tag} right={<GhostBtn onClick={add} icon={Plus}>태그 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          "매장출근카운트"를 끄면(아니오) 그 태그가 입력된 사람은 자동으로 출근인원 계산에서 제외됩니다.
          왼쪽 ⠿ 를 눌러서 드래그하면 순서를 바꿀 수 있습니다.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 w-6"></th>
              <th className="py-2 font-semibold">태그</th>
              <th className="py-2 font-semibold">분류</th>
              <th className="py-2 font-semibold">매장출근카운트</th>
              <th className="py-2 font-semibold">휴무/휴일구분</th>
              <th className="py-2 font-semibold">휴무/휴일 후보</th>
              <th className="py-2 font-semibold">연차추적</th>
              <th className="py-2 font-semibold">연차종류</th>
              <th className="py-2 font-semibold">시간(H)</th>
              <th className="py-2 font-semibold">근무조 환산</th>
              <th className="py-2 font-semibold">설명</th>
              <th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t, i) => (
              <tr
                key={t.id || t.code}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                className={`border-b border-slate-100 ${overIndex === i ? "bg-indigo-50" : ""}`}
              >
                <td
                  draggable={!locked}
                  onDragStart={() => onDragStart(i)}
                  onDragEnd={onDragEnd}
                  className="py-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing select-none text-center"
                  title="드래그해서 순서 변경"
                >
                  ⠿
                </td>
                <td className="py-1.5 pr-2"><TextInput value={t.code} onChange={(v) => update(t.id, { code: v })} className="w-28" /></td>
                <td className="py-1.5 pr-2">
                  <Select value={t.category} onChange={(v) => update(t.id, { category: v })}
                    options={["근무코드", "확정휴무", "확정근무", "조정"]} />
                </td>
                <td className="py-1.5 pr-2">
                  <Select value={t.countsAsAttend ? "예" : "아니오"} onChange={(v) => update(t.id, { countsAsAttend: v === "예" })} options={["예", "아니오"]} />
                </td>
                <td className="py-1.5 pr-2">
                  <Select value={t.restType} onChange={(v) => update(t.id, { restType: v })} options={["휴무", "휴일", "해당없음"]} />
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <input
                    type="checkbox" checked={!!t.convertToRest}
                    onChange={(ev) => update(t.id, { convertToRest: ev.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <input
                    type="checkbox" checked={!!t.trackAsLeave}
                    onChange={(ev) => update(t.id, { trackAsLeave: ev.target.checked, leavePool: t.leavePool || "연차" })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  {t.trackAsLeave ? <TextInput value={t.leavePool || "연차"} onChange={(v) => update(t.id, { leavePool: v })} className="w-28" placeholder="예: 리프레시/안식휴가" /> : <span className="text-[11px] text-slate-300">-</span>}
                </td>
                <td className="py-1.5 pr-2">
                  {t.trackAsLeave ? <NumberInput value={t.leaveHours ?? ""} onChange={(v) => update(t.id, { leaveHours: v })} className="w-16" /> : <span className="text-[11px] text-slate-300">-</span>}
                </td>
                <td className="py-1.5 pr-2">
                  <Select
                    value={t.countsAsShift || ""}
                    onChange={(v) => update(t.id, { countsAsShift: v })}
                    options={["", ...data.ftTemplates.map((f) => f.code).filter(Boolean)]}
                    className="w-20"
                  />
                </td>
                <td className="py-1.5 pr-2"><TextInput value={t.desc} onChange={(v) => update(t.id, { desc: v })} className="w-40" /></td>
                <td><IconBtn onClick={() => remove(t.id)} title="삭제" danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-3">
          "연차추적"을 켜고 시간(H)을 지정하면(예: 연차=8H, 반차=4H, 반반차=2H), [연차현황] 탭에서 이 태그가 입력된 날짜를 자동으로 집계해 보여줍니다.
          "연차종류"를 같은 이름으로 맞춰두면 같은 보유량으로 묶여서 계산됩니다 — 예를 들어 연차/반차/반반차는 "연차"로, 리프레시휴가·안식휴가는
          새로 태그를 추가해서 "리프레시/안식휴가"라는 이름으로 묶어두면 [연차현황]에서 별도의 보유량으로 따로 관리됩니다.
          "근무조 환산"을 지정하면 그날 그 근무조 인원 1명으로 계산됩니다 (예: 반차(오후)·반반차 → A조).
          "휴무/휴일 후보"를 켜두면(예: RQ 같은 휴무 요청 태그), 1단계 실행 시 그 사람의 남은 휴무/휴일로 자동 전환되고,
          휴무/휴일을 다 소진했으면 연차 잔여가 남아있는 만큼만 하루 단위 연차로 등록됩니다 (반차·반반차는 자동 전환하지 않습니다).
        </p>
      </SectionCard>
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   공휴일 · 이슈일 · 개인지정태그 탭
   ============================================================ */
function HolidaysTab({ data, setData, role }) {
  const locked = role === "viewer"; // 공휴일/이슈일/고정휴무 설정은 매장관리자 이상만 (개인 요청은 [요청] 탭으로 분리됨)
  const { holidays, issueDays, employees } = data;
  const fixedRestSchedules = data.fixedRestSchedules || [];
  const dayPairOptions = data.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS;

  const updHol = (i, patch) => setData((d) => { const arr = [...d.holidays]; arr[i] = { ...arr[i], ...patch }; return { ...d, holidays: arr }; });
  const rmHol = (i) => setData((d) => ({ ...d, holidays: d.holidays.filter((_, idx) => idx !== i) }));
  const addHol = () => setData((d) => ({ ...d, holidays: [...d.holidays, { date: "", name: "" }] }));

  const updIss = (i, patch) => setData((d) => { const arr = [...d.issueDays]; arr[i] = { ...arr[i], ...patch }; return { ...d, issueDays: arr }; });
  const rmIss = (i) => setData((d) => ({ ...d, issueDays: d.issueDays.filter((_, idx) => idx !== i) }));
  const addIss = () => setData((d) => ({ ...d, issueDays: [...d.issueDays, { start: "", end: "", name: "", ftOverride: "", ptOverride: "" }] }));

  const updFixed = (i, patch) => setData((d) => { const arr = [...(d.fixedRestSchedules || [])]; arr[i] = { ...arr[i], ...patch }; return { ...d, fixedRestSchedules: arr }; });
  const rmFixed = (i) => setData((d) => ({ ...d, fixedRestSchedules: (d.fixedRestSchedules || []).filter((_, idx) => idx !== i) }));
  const addFixed = () => setData((d) => {
    const opts = d.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS;
    return { ...d, fixedRestSchedules: [...(d.fixedRestSchedules || []), { start: "", end: "", dayPair: opts[0]?.label || "", empNames: [] }] };
  });
  const toggleFixedEmp = (i, name) => setData((d) => {
    const arr = [...(d.fixedRestSchedules || [])];
    const cur = arr[i].empNames || [];
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    arr[i] = { ...arr[i], empNames: next };
    return { ...d, fixedRestSchedules: arr };
  });

  // 휴무 방식은 이제 인원별로 [직원목록]에서 지정한다 - 여기는 "고정휴무"로 지정된 인원만 대상으로 노출
  const ftEmployeeNames = employees.filter((e) => e.type === "정직원" && (e.restMode || "로테이션") === "고정휴무").map((e) => e.name);

  return (
    <div className="max-w-5xl">
      {locked && <ReadOnlyNotice>공휴일·이슈일·고정휴무 설정은 매장관리자 이상만 수정할 수 있습니다. 본인 휴무 요청은 [요청] 탭에서 등록하세요.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard title="공휴일 목록" icon={CalendarDays} right={<GhostBtn onClick={addHol} icon={Plus}>공휴일 추가</GhostBtn>}>
        <div className="grid grid-cols-1 gap-1.5">
          {holidays.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <DateInput value={h.date} onChange={(v) => updHol(i, { date: v })} />
              <TextInput value={h.name} onChange={(v) => updHol(i, { name: v })} placeholder="공휴일명" className="w-40" />
              <IconBtn onClick={() => rmHol(i)} title="삭제" danger />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="이슈일 (기간 지정 · 적정인원 조정)" icon={ClipboardList} right={<GhostBtn onClick={addIss} icon={Plus}>이슈일 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">적정인원 칸을 비워두면 이슈일명만 표시되고 평소 로직을 따릅니다.</p>
        <div className="grid grid-cols-1 gap-1.5">
          {issueDays.map((iss, i) => (
            <div key={i} className="flex items-center gap-2">
              <DateInput value={iss.start} onChange={(v) => updIss(i, { start: v })} />
              <span className="text-slate-400 text-xs">~</span>
              <DateInput value={iss.end} onChange={(v) => updIss(i, { end: v })} />
              <TextInput value={iss.name} onChange={(v) => updIss(i, { name: v })} placeholder="이슈일명" className="w-40" />
              <NumberInput value={iss.ftOverride} onChange={(v) => updIss(i, { ftOverride: v })} className="w-20" />
              <span className="text-[10px] text-slate-400">정직원</span>
              <NumberInput value={iss.ptOverride} onChange={(v) => updIss(i, { ptOverride: v })} className="w-20" />
              <span className="text-[10px] text-slate-400">PT</span>
              <IconBtn onClick={() => rmIss(i)} title="삭제" danger />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="고정휴무 설정 (정직원)" icon={CalendarDays} right={<GhostBtn onClick={addFixed} icon={Plus}>고정휴무 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          [직원목록]에서 "고정휴무"로 지정한 인원만 매주 같은 요일쌍으로 쉬는 패턴을 여기서 지정합니다 (예: 월화 고정휴무 5명).
          [요청] 탭에 등록된 개인 요청(요청휴무·이슈)이 항상 먼저 반영되고, 남은 칸에 여기서 지정한 요일이 자동으로 휴무/휴일로 채워집니다.
          기간을 나눠서 여러 개 등록하면 월별로 다른 패턴도 반영할 수 있습니다. 그날 최소 출근인원(또는 리더 최소인원)이
          부족해지면, 그 달 우선순위가 낮은 직원의 휴무만 건너뛰고 나머지는 그대로 배정됩니다(우선순위는 매달 자동으로 돌아가
          특정 인원만 계속 손해보지 않습니다).
        </p>
        {ftEmployeeNames.length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
            고정휴무로 지정된 직원이 없습니다 — [직원목록]에서 정직원의 "휴무방식"을 "고정휴무"로 먼저 지정하세요.
          </p>
        )}
        <div className="space-y-2">
          {fixedRestSchedules.map((f, i) => (
            <div key={i} className="border border-slate-200 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <MonthInput value={monthOf(f.start)} onChange={(ym) => updFixed(i, { start: monthToStart(ym) })} />
                <span className="text-slate-400 text-xs">~</span>
                <MonthInput value={monthOf(f.end)} onChange={(ym) => updFixed(i, { end: monthToEnd(ym) })} />
                <span className="text-[10px] text-slate-400">(종료월을 비우면 시작월 한 달만 적용)</span>
                <span className="text-xs text-slate-400 ml-1">구분</span>
                <Select value={f.dayPair} onChange={(v) => updFixed(i, { dayPair: v })} options={dayPairOptions.map((p) => p.label)} className="w-24" />
                <IconBtn onClick={() => rmFixed(i)} title="삭제" danger />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 mr-1">인원</span>
                {ftEmployeeNames.map((name) => (
                  <label key={name} className={`text-[11px] px-2 py-1 rounded cursor-pointer select-none ${(f.empNames || []).includes(name) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <input type="checkbox" className="hidden" checked={(f.empNames || []).includes(name)} onChange={() => toggleFixedEmp(i, name)} />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {fixedRestSchedules.length === 0 && <p className="text-xs text-slate-400">등록된 고정휴무가 없습니다.</p>}
        </div>
      </SectionCard>
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   요청 탭 (구 "개인 지정 태그" - [공휴일·이슈일]에서 분리)
   설정 화면들과 달리 3개 역할 모두 편집 가능 - 사용자(뷰어)가 본인 휴무 요청을
   직접 등록할 수 있는 유일한 화면이라, 사이드바에서도 "설정"이 아니라 "스케줄"
   그룹에 둬서 뷰어에게도 항상 보이게 한다.
   ============================================================ */
function RequestsTab({ data, setData }) {
  const { personalTags, employees, tags } = data;

  const updPt = (i, patch) => setData((d) => { const arr = [...d.personalTags]; arr[i] = { ...arr[i], ...patch }; return { ...d, personalTags: arr }; });
  const rmPt = (i) => setData((d) => ({ ...d, personalTags: d.personalTags.filter((_, idx) => idx !== i) }));
  const addPt = () => setData((d) => ({ ...d, personalTags: [...d.personalTags, { start: "", end: "", empNames: [], tagCode: tags[0]?.code || "" }] }));
  const togglePtEmp = (i, name) => setData((d) => {
    const arr = [...d.personalTags];
    const cur = arr[i].empNames || (arr[i].empName ? [arr[i].empName] : []);
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    arr[i] = { ...arr[i], empNames: next, empName: undefined };
    return { ...d, personalTags: arr };
  });
  const setPtAll = (i, allNames) => setData((d) => {
    const arr = [...d.personalTags];
    const cur = arr[i].empNames || (arr[i].empName ? [arr[i].empName] : []);
    const allSelected = allNames.length > 0 && allNames.every((n) => cur.includes(n));
    arr[i] = { ...arr[i], empNames: allSelected ? [] : [...allNames], empName: undefined };
    return { ...d, personalTags: arr };
  });

  return (
    <div className="max-w-5xl">
      <SectionCard title="요청" icon={Tag} right={<GhostBtn onClick={addPt} icon={Plus}>요청 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          휴무 요청·연차·경조사 등 본인 일정을 등록해두면, [스케줄]에서 자동배정 실행 시 해당 기간의 스케줄 칸에 태그가 채워집니다(기존 값은 덮어쓰지 않음).
          백화점 점휴일처럼 매장 전체가 같은 날 쉬어야 할 때는 "전체선택"으로 한 번에 지정할 수 있습니다. <b>이 화면은 총관리자·매장관리자·사용자 누구나 등록·삭제할 수 있습니다.</b>
        </p>
        <div className="space-y-2">
          {personalTags.map((pt, i) => {
            const selectedNames = pt.empNames || (pt.empName ? [pt.empName] : []);
            const allNames = employees.map((e) => e.name);
            const allSelected = allNames.length > 0 && allNames.every((n) => selectedNames.includes(n));
            return (
              <div key={i} className="border border-slate-200 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <DateInput value={pt.start} onChange={(v) => updPt(i, { start: v, end: (!pt.end || pt.end === pt.start) ? v : pt.end })} />
                  <span className="text-slate-400 text-xs">~</span>
                  <DateInput value={pt.end} onChange={(v) => updPt(i, { end: v })} />
                  <span className="text-[10px] text-slate-400">(하루만 해당되면 시작일만 입력해도 됩니다)</span>
                  <span className="text-xs text-slate-400 ml-1">태그</span>
                  <Select value={pt.tagCode} onChange={(v) => updPt(i, { tagCode: v })} options={tags.map((t) => t.code)} className="w-28" />
                  <button
                    onClick={() => setPtAll(i, allNames)}
                    className={`text-[11px] px-2 py-1 rounded ${allSelected ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  >
                    전체선택
                  </button>
                  <IconBtn onClick={() => rmPt(i)} title="삭제" danger />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-400 mr-1">인원</span>
                  {allNames.map((name) => (
                    <label key={name} className={`text-[11px] px-2 py-1 rounded cursor-pointer select-none ${selectedNames.includes(name) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <input type="checkbox" className="hidden" checked={selectedNames.includes(name)} onChange={() => togglePtEmp(i, name)} />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {personalTags.length === 0 && <p className="text-xs text-slate-400">등록된 요청이 없습니다.</p>}
        </div>
      </SectionCard>
      <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-md px-3 py-2 mt-3">
        <b>참고.</b> 여기 등록만으로는 스케줄에 반영되지 않습니다. [스케줄 1·2개월차]에서 1단계(휴무/휴일 자동배정)를 실행해야 실제 스케줄 칸에 채워집니다.
      </div>
    </div>
  );
}

/* ============================================================
   근무형태템플릿 탭
   ============================================================ */
function ShiftTemplatesTab({ data, setData, role }) {
  const locked = role === "viewer";
  const { ftTemplates, ptTemplates, prefCode } = data;
  const thresholds = data.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };

  const updFt = (i, patch) => setData((d) => { const a = [...d.ftTemplates]; a[i] = { ...a[i], ...patch }; return { ...d, ftTemplates: a }; });
  const rmFt = (i) => setData((d) => ({ ...d, ftTemplates: d.ftTemplates.filter((_, idx) => idx !== i) }));
  const addFt = () => setData((d) => {
    const th = d.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
    return {
      ...d,
      ftTemplates: [...d.ftTemplates, {
        code: "", start: "", end: "",
        wdCounts: th.weekday.map(() => ""), weCounts: th.weekend.map(() => ""),
      }],
    };
  });

  const updThreshold = (group, idx, val) => setData((d) => {
    const cur = d.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
    const arr = [...cur[group]];
    arr[idx] = val;
    return { ...d, ftThresholds: { ...cur, [group]: arr } };
  });

  const addCol = (group) => setData((d) => {
    const cur = d.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
    const last = cur[group][cur[group].length - 1];
    const newArr = [...cur[group], (Number(last) || 0) + 1];
    const countsKey = group === "weekday" ? "wdCounts" : "weCounts";
    return {
      ...d,
      ftThresholds: { ...cur, [group]: newArr },
      ftTemplates: d.ftTemplates.map((t) => ({ ...t, [countsKey]: [...(t[countsKey] || []), ""] })),
    };
  });

  const removeCol = (group, idx) => setData((d) => {
    const cur = d.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
    if (cur[group].length <= 1) return d;
    const newArr = cur[group].filter((_, i) => i !== idx);
    const countsKey = group === "weekday" ? "wdCounts" : "weCounts";
    return {
      ...d,
      ftThresholds: { ...cur, [group]: newArr },
      ftTemplates: d.ftTemplates.map((t) => ({ ...t, [countsKey]: (t[countsKey] || []).filter((_, i) => i !== idx) })),
    };
  });

  const updCount = (templateIdx, countsKey, colIdx, val) => setData((d) => {
    const a = [...d.ftTemplates];
    const counts = [...(a[templateIdx][countsKey] || [])];
    counts[colIdx] = val;
    a[templateIdx] = { ...a[templateIdx], [countsKey]: counts };
    return { ...d, ftTemplates: a };
  });

  const updPt = (i, patch) => setData((d) => { const a = [...d.ptTemplates]; a[i] = { ...a[i], ...patch }; return { ...d, ptTemplates: a }; });
  const rmPt = (i) => setData((d) => ({ ...d, ptTemplates: d.ptTemplates.filter((_, idx) => idx !== i) }));
  const addPt = () => setData((d) => ({ ...d, ptTemplates: [...d.ptTemplates, { code: "", start: "", end: "" }] }));

  return (
    <div className="max-w-6xl">
      {locked && <ReadOnlyNotice>이 화면은 열람만 가능합니다. 변경이 필요하면 매장관리자 이상에게 요청하세요.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard title="정직원 근무형태" icon={ClipboardCheck} right={<GhostBtn onClick={addFt} icon={Plus}>근무코드 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          "평일/주말 몇 인" 기준 칸 개수는 매장마다 다를 수 있어 자유롭게 늘리고 줄일 수 있습니다. 출근인원이 여러 기준 중 가장 가까운 값에 맞춰 그 열의 인원수를 자동으로 사용합니다.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <GhostBtn onClick={() => addCol("weekday")} icon={Plus}>평일 칸 추가</GhostBtn>
          <GhostBtn onClick={() => addCol("weekend")} icon={Plus}>주말 칸 추가</GhostBtn>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2" style={{ width: 90 }}>코드</th>
                <th style={{ width: 90 }}>시작</th>
                <th style={{ width: 90 }}>종료</th>
                {thresholds.weekday.map((val, idx) => (
                  <th key={"wd" + idx} className="text-center align-bottom pb-2" style={{ width: 84 }}>
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-center gap-1">
                      평일
                      {thresholds.weekday.length > 1 && (
                        <button onClick={() => removeCol("weekday", idx)} className="text-slate-300 hover:text-red-500" title="이 칸 삭제">✕</button>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <NumberInput value={val} onChange={(v) => updThreshold("weekday", idx, v)} className="w-11 px-1 text-center" />
                      <span className="text-[11px] text-slate-400">인</span>
                    </div>
                  </th>
                ))}
                {thresholds.weekend.map((val, idx) => (
                  <th key={"we" + idx} className="text-center align-bottom pb-2" style={{ width: 84 }}>
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-center gap-1">
                      주말
                      {thresholds.weekend.length > 1 && (
                        <button onClick={() => removeCol("weekend", idx)} className="text-slate-300 hover:text-red-500" title="이 칸 삭제">✕</button>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <NumberInput value={val} onChange={(v) => updThreshold("weekend", idx, v)} className="w-11 px-1 text-center" />
                      <span className="text-[11px] text-slate-400">인</span>
                    </div>
                  </th>
                ))}
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {ftTemplates.map((t, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 pr-1"><TextInput value={t.code} onChange={(v) => updFt(i, { code: v })} className="w-20" /></td>
                  <td className="pr-1"><TextInput value={t.start} onChange={(v) => updFt(i, { start: v })} className="w-20" /></td>
                  <td className="pr-1"><TextInput value={t.end} onChange={(v) => updFt(i, { end: v })} className="w-20" /></td>
                  {(t.wdCounts || []).map((c, colIdx) => (
                    <td key={"wdc" + colIdx} className="text-center"><NumberInput value={c} onChange={(v) => updCount(i, "wdCounts", colIdx, v)} className="w-14 text-center" /></td>
                  ))}
                  {(t.weCounts || []).map((c, colIdx) => (
                    <td key={"wec" + colIdx} className="text-center"><NumberInput value={c} onChange={(v) => updCount(i, "weCounts", colIdx, v)} className="w-14 text-center" /></td>
                  ))}
                  <td className="text-center"><IconBtn onClick={() => rmFt(i)} danger /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">쉬기 전날 우선 근무형태</span>
          <TextInput value={prefCode} onChange={(v) => setData((d) => ({ ...d, prefCode: v }))} className="w-20" />
          <span className="text-[11px] text-slate-400">(비워두면 사용 안 함)</span>
        </div>
      </SectionCard>


      <SectionCard title="파트타이머 근무형태 (코드 정의)" icon={ClipboardCheck} right={<GhostBtn onClick={addPt} icon={Plus}>추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          여기서는 코드와 시간대만 정의합니다. 실제로 "누가 어떤 코드로 언제 근무할지"는 [직원목록] 탭에서 파트타이머별로 지정합니다.
        </p>
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2">코드</th><th>시작</th><th>종료</th><th></th>
            </tr>
          </thead>
          <tbody>
            {ptTemplates.map((t, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1"><TextInput value={t.code} onChange={(v) => updPt(i, { code: v })} className="w-20" /></td>
                <td><TextInput value={t.start} onChange={(v) => updPt(i, { start: v })} className="w-24" /></td>
                <td><TextInput value={t.end} onChange={(v) => updPt(i, { end: v })} className="w-24" /></td>
                <td><IconBtn onClick={() => rmPt(i)} danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   스케줄 탭 (월별 그리드)
   ============================================================ */
const STATUS_STYLE = {
  NOT: "bg-red-100 text-red-700",
  OK: "bg-green-100 text-green-700",
  AVAILABLE: "bg-amber-100 text-amber-700",
};
function attendStatus(attend, required) {
  if (attend < required) return "NOT";
  if (attend > required) return "AVAILABLE";
  return "OK";
}
function attendStatus2(attend, required) {
  return attend < required ? "NOT" : "OK";
}

function ScheduleGrid({ data, setData, schedule, setSchedule, monthKey, days, priorMonthCarry, filterDate, filterMode }) {
  const { employees, tags, settings } = data;
  const memoRowLabels = data.memoRowLabels || [];
  const memoKey = monthKey === "m1" ? "m1Memo" : "m2Memo";

  const allCodes = useMemo(() => {
    const set = new Set(["", ...tags.map((t) => t.code)]);
    data.ftTemplates.forEach((t) => t.code && set.add(t.code));
    data.ptTemplates.forEach((t) => t.code && set.add(t.code));
    return Array.from(set);
  }, [tags, data.ftTemplates, data.ptTemplates]);

  const ftCodeList = useMemo(() => data.ftTemplates.map((t) => t.code).filter(Boolean), [data.ftTemplates]);

  const active = employees.filter((e) => isActiveEmployee(e));
  const ftList = active.filter((e) => e.type === "정직원");
  const ptList = active.filter((e) => e.type === "파트타이머");

  const satT = satTarget(days);
  const sunHolT = sunHolTarget(days);

  // 직원별 이번달 휴무/휴일 잔여수량 (2개월차면 1개월차에서 당겨쓴 만큼 반영)
  const remainByEmp = useMemo(() => {
    const result = {};
    ftList.forEach((e) => {
      // 자동배정 대상이 아닌 인원(지원/스위칭 등)은 목표 자체가 없으므로 잔여를 계산하지 않음
      if (!isAutoAssignable(e)) return;
      let humu = 0, hyuil = 0;
      (schedule[monthKey][e.id] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
      const carry = priorMonthCarry?.[e.id] || { humu: 0, hyuil: 0 };
      result[e.id] = {
        remainHumu: satT - humu - carry.humu,
        remainHyuil: sunHolT - hyuil - carry.hyuil,
      };
    });
    return result;
  }, [ftList, schedule, monthKey, satT, sunHolT, priorMonthCarry]);

  // 직원별 근무형태 코드 배정 횟수 집계
  const codeCountByEmp = useMemo(() => {
    const result = {};
    ftList.forEach((e) => {
      const counts = {};
      ftCodeList.forEach((c) => { counts[c] = 0; });
      (schedule[monthKey][e.id] || []).forEach((v) => { if (v && counts.hasOwnProperty(v)) counts[v]++; });
      result[e.id] = counts;
    });
    return result;
  }, [ftList, ftCodeList, schedule, monthKey]);

  const dayStats = days.map((day) => {
    let ftAttend = 0, ptAttend = 0, leaderAttend = 0;
    active.forEach((e) => {
      // 계약기간(인턴 등) 밖이거나 아직 "1인분"으로 세지 않기로 한 인원은 적정인원 카운트에서 제외
      if (e.type === "정직원" && (!isUnderContractOn(e, day.dateStr) || !isCountedOn(e, day.dateStr))) return;
      const v = schedule[monthKey][e.id]?.[day.day - 1] || "";
      const attend = v !== "" && !isOffTag(tags, v);
      if (e.type === "정직원" && attend) {
        ftAttend++;
        if (e.role === "리더") leaderAttend++;
      }
      if (e.type === "파트타이머" && attend) ptAttend++;
    });
    return {
      ftReq: requiredFT(settings, day), ptReq: requiredPT(settings, day), leaderReq: requiredLeaderFT(settings, day),
      ftAttend, ptAttend, leaderAttend,
      leaveSlack: Math.max(0, ftAttend - requiredFT(settings, day)),
    };
  });

  // 기준일 인원 필터: 선택한 날짜의 셀 값이 조건에 맞는 직원 행만 남긴다(열은 그대로 전체 표시)
  const filterDayIdx = filterDate ? days.findIndex((d) => d.dateStr === filterDate) : -1;
  const passesFilter = (e) => {
    if (!filterMode || filterMode === "all" || filterDayIdx < 0) return true;
    const v = schedule[monthKey][e.id]?.[filterDayIdx] || "";
    const off = v !== "" && isOffTag(tags, v);
    if (filterMode === "working") return v !== "" && !off;
    if (filterMode === "off") return off;
    return v === filterMode; // 특정 근무조 코드 선택
  };
  const visibleFtList = ftList.filter(passesFilter);
  const visiblePtList = ptList.filter(passesFilter);

  const setCell = (empId, dayIdx, value) => {
    setSchedule((prev) => {
      const next = { ...prev, [monthKey]: { ...prev[monthKey] } };
      const arr = [...(next[monthKey][empId] || [])];
      arr[dayIdx] = value;
      next[monthKey][empId] = arr;
      return next;
    });
  };

  const setMemoCell = (rowId, dayIdx, value) => {
    setSchedule((prev) => {
      const next = { ...prev, [memoKey]: { ...(prev[memoKey] || {}) } };
      const arr = [...(next[memoKey][rowId] || [])];
      arr[dayIdx] = value;
      next[memoKey][rowId] = arr;
      return next;
    });
  };

  const addMemoRow = () => {
    const label = window.prompt("추가할 줄 이름을 입력하세요 (예: STORE MEMO, 도슨트, 연차, 시프트)");
    if (!label) return;
    const id = "memo_" + Date.now();
    setData((d) => ({ ...d, memoRowLabels: [...(d.memoRowLabels || []), { id, label }] }));
    // m1Memo/m2Memo 배열은 memoRowLabels 변경을 감지하는 재정합 로직이 자동으로 두 달 길이에 맞춰 만들어줌
  };
  const removeMemoRow = (id) => {
    if (!window.confirm("이 줄을 삭제할까요? 입력해둔 내용도 함께 사라집니다.")) return;
    setData((d) => ({ ...d, memoRowLabels: (d.memoRowLabels || []).filter((r) => r.id !== id) }));
    setSchedule((prev) => {
      const m1Memo = { ...(prev.m1Memo || {}) }; delete m1Memo[id];
      const m2Memo = { ...(prev.m2Memo || {}) }; delete m2Memo[id];
      return { ...prev, m1Memo, m2Memo };
    });
  };

  const cellW = 54;
  const nameW = 100;
  const remainColW = 46;
  // 공휴일/이슈 줄부터 메모 줄까지, "잔여휴무·잔여휴일" 두 칸 자리를 세로로 병합해 보여줄 행 수
  // (정직원/파트타이머 표에서만 실제로 잔여휴무·잔여휴일 값이 들어가므로, 그 위쪽 요약 줄들은 빈 칸을 합쳐서 보여준다)
  const theadMergeRowSpan = 6 + (settings.leaderMinEnabled ? 1 : 0) + memoRowLabels.length;
  const extraLeftCols = 2; // 잔여휴무, 잔여휴일
  const trailingCols = ftCodeList.length;

  const headerCellStyle = (day) => {
    let bg = "#fff", color = "#334155";
    if (day.holidayName) { color = "#dc2626"; }
    else if (day.issueName) { color = "#059669"; }
    else if (day.weekday === "토") { color = "#2563eb"; }
    else if (day.weekday === "일") { color = "#dc2626"; }
    if (day.weekday === "토" || day.weekday === "일" || day.holidayName) bg = "#fef2f2";
    return { background: bg, color, minWidth: cellW, maxWidth: cellW };
  };

  const cellTextColor = (v) => (v === "휴무" ? "#2563eb" : v === "휴일" ? "#dc2626" : undefined);

  const RemainBadge = ({ n }) => {
    if (n > 0) return <span className="text-amber-600 font-semibold">부족{n}</span>;
    if (n < 0) return <span className="text-red-600 font-semibold">초과{-n}</span>;
    return <span className="text-green-600 font-semibold">OK</span>;
  };

  const FillerCells = ({ count, bg = "" }) => count > 0 ? <>{Array.from({ length: count }).map((_, i) => <td key={i} className={`border border-slate-200 ${bg}`} />)}</> : null;

  return (
    <div>
      <div className="flex items-center gap-6 mb-3 text-sm">
        <div><span className="text-slate-500">적용 연도월:</span> <b>{days.length ? `${days[0].dateStr.slice(0, 7)}` : "-"}</b></div>
        <div><span className="text-slate-500">이번달 휴무목표(토요일수):</span> <b className="text-indigo-600">{satT}</b></div>
        <div><span className="text-slate-500">이번달 휴일목표(일요일+공휴일수):</span> <b className="text-indigo-600">{sunHolT}</b></div>
        <GhostBtn onClick={addMemoRow} icon={Plus}>메모 줄 추가</GhostBtn>
      </div>

      {/* 세로/가로 스크롤을 이 박스 안에서 직접 담당해야 머리글(thead)의 sticky top이 실제로 동작한다 -
          바깥 페이지 스크롤에 맡기면 overflow-x:auto가 있는 한 브라우저가 overflow-y도 함께
          "auto"로 취급해버려서(내용 높이만큼 딱 맞게 커지는 빈 스크롤 컨테이너가 생김), sticky의
          기준이 되는 스크롤 컨테이너가 바깥 페이지가 아니라 이 텅 빈 컨테이너가 되어 버려 고정이 전혀 안 된다. */}
      <div className="overflow-auto border border-slate-200 rounded-lg" style={{ maxHeight: "calc(100vh - 300px)" }}>
        <table className="text-xs border-collapse" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-30">
            <tr>
              <th style={{ minWidth: nameW, maxWidth: nameW }} className="sticky left-0 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left z-10"></th>
              <th style={{ minWidth: remainColW, maxWidth: remainColW }} className="bg-slate-100 border border-slate-200"></th>
              <th style={{ minWidth: remainColW, maxWidth: remainColW }} className="bg-slate-100 border border-slate-200"></th>
              {days.map((day) => (
                <th key={day.day} style={headerCellStyle(day)} className="border border-slate-200 px-1 py-1.5 font-semibold">
                  {day.day}<br /><span className="font-normal">{day.weekday}</span>
                </th>
              ))}
              {ftCodeList.map((c) => (
                <th key={c} style={{ minWidth: 44, maxWidth: 44 }} className="bg-slate-100 border border-slate-200"></th>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] text-slate-400 z-10">공휴일/이슈</td>
              <td className="bg-white border border-slate-200" colSpan={extraLeftCols} rowSpan={theadMergeRowSpan}></td>
              {days.map((day) => (
                <td key={day.day} className="bg-white border border-slate-200 px-1 py-1 text-[9px] text-center text-slate-500 whitespace-nowrap overflow-hidden">
                  {day.holidayName || day.issueName || ""}
                </td>
              ))}
              <FillerCells count={trailingCols} bg="bg-white" />
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] text-slate-400 z-10">적정(FT/PT)</td>
              {days.map((day, i) => (
                <td key={day.day} className="bg-white border border-slate-200 px-1 py-1 text-[10px] text-center text-slate-500">
                  {dayStats[i].ftReq}/{dayStats[i].ptReq}
                </td>
              ))}
              <FillerCells count={trailingCols} bg="bg-white" />
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold z-10">출근(FT/PT)</td>
              {days.map((day, i) => (
                <td key={day.day} className="bg-white border border-slate-200 px-1 py-1 text-[10px] text-center">
                  {dayStats[i].ftAttend}/{dayStats[i].ptAttend}
                </td>
              ))}
              <FillerCells count={trailingCols} bg="bg-white" />
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold z-10">적정확인(정직원)</td>
              {days.map((day, i) => {
                const status = attendStatus(dayStats[i].ftAttend, dayStats[i].ftReq);
                return (
                  <td key={day.day} className={`border border-slate-200 px-1 py-1 text-[9px] text-center font-bold ${STATUS_STYLE[status]}`}>
                    {status}
                  </td>
                );
              })}
              <FillerCells count={trailingCols} bg="bg-white" />
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold z-10">적정확인(파트타이머)</td>
              {days.map((day, i) => {
                const status = attendStatus2(dayStats[i].ptAttend, dayStats[i].ptReq);
                return (
                  <td key={day.day} className={`border border-slate-200 px-1 py-1 text-[9px] text-center font-bold ${STATUS_STYLE[status]}`}>
                    {status}
                  </td>
                );
              })}
              <FillerCells count={trailingCols} bg="bg-white" />
            </tr>
            {settings.leaderMinEnabled && (
              <tr>
                <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold z-10">적정확인(리더)</td>
                {days.map((day, i) => {
                  const status = attendStatus2(dayStats[i].leaderAttend, dayStats[i].leaderReq);
                  return (
                    <td key={day.day} className={`border border-slate-200 px-1 py-1 text-[9px] text-center font-bold ${STATUS_STYLE[status]}`}>
                      {status}
                    </td>
                  );
                })}
                <FillerCells count={trailingCols} bg="bg-white" />
              </tr>
            )}
            <tr>
              <td className="sticky left-0 bg-sky-50 border border-slate-200 px-2 py-1 text-[10px] text-sky-700 font-semibold z-10">여유인원</td>
              {days.map((day, i) => (
                <td key={day.day} className="border border-slate-200 px-1 py-1 text-[10px] text-center bg-sky-50 text-sky-700 font-semibold">
                  {dayStats[i].leaveSlack}
                </td>
              ))}
              <FillerCells count={trailingCols} bg="bg-sky-50" />
            </tr>
            {memoRowLabels.map((row) => (
              <tr key={row.id}>
                <td className="sticky left-0 bg-amber-50 border border-slate-200 px-2 py-1 text-[10px] text-amber-700 font-semibold z-10">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{row.label}</span>
                    <button onClick={() => removeMemoRow(row.id)} className="text-amber-300 hover:text-red-500 flex-shrink-0" title="이 줄 삭제">✕</button>
                  </div>
                </td>
                {days.map((day, i) => (
                  <td key={day.day} className="border border-slate-200 p-0 bg-amber-50 align-top">
                    <AutoGrowTextarea
                      value={(schedule[memoKey]?.[row.id] || [])[i] || ""}
                      onChange={(v) => setMemoCell(row.id, i, v)}
                    />
                  </td>
                ))}
                <FillerCells count={trailingCols} bg="bg-amber-50" />
              </tr>
            ))}
          </thead>
          <tbody>
            <tr className="bg-indigo-50 text-indigo-700 font-bold text-[11px]">
              <td className="px-2 py-1 sticky left-0 bg-indigo-50 border border-indigo-100">정직원</td>
              <td className="px-1 py-1 text-center border border-indigo-100">잔여휴무</td>
              <td className="px-1 py-1 text-center border border-indigo-100">잔여휴일</td>
              <td className="border border-indigo-100" colSpan={days.length}></td>
              {ftCodeList.map((c) => (
                <td key={c} className="px-1 py-1 text-center border border-indigo-100">{c}</td>
              ))}
            </tr>
            {visibleFtList.map((e) => (
              <tr key={e.id}>
                <td className="sticky left-0 bg-white border border-slate-200 px-2 py-1 font-medium z-10">
                  {e.name}
                  {e.role === "리더" && <span className="ml-1 text-[9px] text-amber-600 font-bold align-top">리더</span>}
                  {e.role === "인턴" && <span className="ml-1 text-[9px] text-sky-600 font-bold align-top">인턴</span>}
                </td>
                <td className="border border-slate-200 px-1 py-1 text-center text-[10px]">
                  {remainByEmp[e.id] ? <RemainBadge n={remainByEmp[e.id].remainHumu} /> : <span className="text-slate-300">-</span>}
                </td>
                <td className="border border-slate-200 px-1 py-1 text-center text-[10px]">
                  {remainByEmp[e.id] ? <RemainBadge n={remainByEmp[e.id].remainHyuil} /> : <span className="text-slate-300">-</span>}
                </td>
                {days.map((day, i) => {
                  const v = schedule[monthKey][e.id]?.[i] || "";
                  if (!isUnderContractOn(e, day.dateStr)) {
                    return <td key={day.day} className="border border-slate-200 bg-slate-100 text-center text-slate-300 text-[10px] py-1.5" title="계약기간 밖">-</td>;
                  }
                  return (
                    <td key={day.day} className="border border-slate-200 p-0">
                      <select
                        value={v}
                        onChange={(ev) => setCell(e.id, i, ev.target.value)}
                        style={{ color: cellTextColor(v) }}
                        className="w-full h-full text-[10px] text-center border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1.5 font-semibold"
                      >
                        {allCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  );
                })}
                {ftCodeList.map((c) => (
                  <td key={c} className="border border-slate-200 px-1 py-1 text-center text-[10px] text-slate-600">{codeCountByEmp[e.id]?.[c] ?? 0}</td>
                ))}
              </tr>
            ))}
            <tr className="bg-amber-50 text-amber-700 font-bold text-[11px]">
              <td className="px-2 py-1 sticky left-0 bg-amber-50 border border-amber-100">파트타이머</td>
              <td className="border border-amber-100" colSpan={extraLeftCols}></td>
              <td className="border border-amber-100" colSpan={days.length}></td>
              <FillerCells count={trailingCols} />
            </tr>
            {visiblePtList.map((e) => (
              <tr key={e.id}>
                <td className="sticky left-0 bg-white border border-slate-200 px-2 py-1 font-medium z-10">{e.name}</td>
                <td className="border border-slate-200" colSpan={extraLeftCols}></td>
                {days.map((day, i) => {
                  const v = schedule[monthKey][e.id]?.[i] || "";
                  return (
                    <td key={day.day} className="border border-slate-200 p-0">
                      <select
                        value={v}
                        onChange={(ev) => setCell(e.id, i, ev.target.value)}
                        style={{ color: cellTextColor(v) }}
                        className="w-full h-full text-[10px] text-center border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1.5 font-semibold"
                      >
                        {allCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  );
                })}
                <FillerCells count={trailingCols} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleTab({ data, setData, schedule, setSchedule, archive, setArchive, monthsMeta, monthKey, role }) {
  const locked = role === "viewer";
  const meta = monthsMeta.find((m) => m.key === monthKey);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const ftCodeOptions = (data.ftTemplates || []).map((t) => t.code).filter(Boolean);

  // 2개월차 화면일 때만: 1개월차에서 이미 목표보다 더/덜 쓴 만큼을 "이월분"으로 계산해서 잔여수량에 반영
  const priorMonthCarry = useMemo(() => {
    if (monthKey !== "m2") return null;
    const m1 = monthsMeta.find((m) => m.key === "m1");
    if (!m1) return null;
    const t1humu = satTarget(m1.days);
    const t1hyuil = sunHolTarget(m1.days);
    const carry = {};
    data.employees.forEach((e) => {
      if (!isAutoAssignable(e)) return; // 자동배정 제외 인원은 이월 계산도 하지 않음
      let humu = 0, hyuil = 0;
      (schedule.m1[e.id] || []).forEach((v) => { if (v === "휴무") humu++; if (v === "휴일") hyuil++; });
      carry[e.id] = { humu: humu - t1humu, hyuil: hyuil - t1hyuil }; // 양수면 1개월차에서 더 씀(당겨씀), 음수면 덜 씀
    });
    return carry;
  }, [monthKey, monthsMeta, schedule.m1, data.employees]);

  const runRestDays = () => {
    setRunning(true);
    setTimeout(() => {
      // 이제 "이 매장이 어떤 방식인지"가 아니라 인원별로 고정휴무/로테이션이 나뉘므로,
      // 두 함수 모두 항상 실행한다 - 각 함수가 자기 대상(고정휴무 인원 / 로테이션 인원)만 알아서 처리한다.
      const { schedule: withPersonal, applied } = applyPersonalTags(schedule, data.employees, data.personalTags, monthsMeta);

      const fr = applyFixedRestSchedules(withPersonal, data.employees, data.fixedRestSchedules, data.dayPairOptions, monthsMeta, data.settings, data.tags);
      const working = fr.schedule;
      const fixedApplied = fr.applied;
      const fixedSkipped = fr.skipped || 0;

      const { schedule: afterRest, message } = assignRestDays(
        working, data.employees, data.tags, data.settings, monthsMeta,
        data.fixedRestSchedules, data.dayPairOptions
      );

      // RQ 같은 "휴무/휴일 후보" 태그를 그 사람의 남은 휴무/휴일(→ 부족하면 연차)로 자동 전환
      const rq = convertRequestTags(afterRest, data.employees, data.tags, data.settings, monthsMeta, {
        annualLeaveGrants: data.annualLeaveGrants,
        archive: archive || {},
      });

      setSchedule(rq.schedule);
      const fixedMsg = ` · 고정휴무로 채운 칸: ${fixedApplied}건${fixedSkipped > 0 ? ` (최소인원 확보를 위해 ${fixedSkipped}건은 건너뜀)` : ""}`;
      const rqMsg = rq.message ? ` · ${rq.message}` : "";
      setMsg(`개인 지정 태그로 채운 칸: ${applied}건${fixedMsg} · ${message}${rqMsg}`);
      setRunning(false);
    }, 30);
  };

  const runShiftCodes = () => {
    setRunning(true);
    setTimeout(() => {
      const { schedule: result, message } = assignShiftCodes(schedule, data.employees, data.tags, data.settings, data.ftTemplates, data.ptTemplates, data.prefCode, monthsMeta, data.ftThresholds);
      setSchedule(result);
      setMsg(message);
      setRunning(false);
    }, 30);
  };

  const runRemainingRest = () => {
    setRunning(true);
    setTimeout(() => {
      const r3 = assignRemainingRest(
        schedule, data.employees, data.tags, data.settings, monthsMeta,
        data.fixedRestSchedules, data.dayPairOptions
      );

      // 휴무가 늘어난 날은 출근인원이 줄었으므로, 그날 근무조를 새 인원수 기준으로 자동 재배정
      let finalSchedule = r3.schedule;
      let rebalanceMsg = "";
      if (r3.changedDayCount > 0) {
        const r2 = assignShiftCodes(
          finalSchedule, data.employees, data.tags, data.settings,
          data.ftTemplates, data.ptTemplates, data.prefCode, monthsMeta, data.ftThresholds
        );
        finalSchedule = r2.schedule;
        rebalanceMsg = ` · 인원이 바뀐 ${r3.changedDayCount}일의 근무조를 새 인원수에 맞게 다시 배정했습니다`;
      }

      setSchedule(finalSchedule);
      const baseMsg = `추가로 배정한 휴무/휴일: ${r3.added}건`;
      const shortMsg = r3.stillShort && r3.stillShort.length > 0
        ? ` · 자리가 부족해 아직 남은 인원: ${r3.stillShort.join(", ")} — 수기로 조정해주세요`
        : ` · 모든 정직원의 잔여 휴무/휴일이 0이 되었습니다`;
      setMsg(baseMsg + rebalanceMsg + shortMsg);
      setRunning(false);
    }, 30);
  };

  const runFinalAdjust = () => {
    setRunning(true);
    setTimeout(() => {
      const r4 = finalAdjust(
        schedule, data.employees, data.tags, data.settings, monthsMeta,
        data.fixedRestSchedules, data.dayPairOptions
      );

      // 자리를 바꾼 날은 근무조도 다시 배정
      let finalSchedule = r4.schedule;
      if (r4.changedDayCount > 0) {
        finalSchedule = assignShiftCodes(
          finalSchedule, data.employees, data.tags, data.settings,
          data.ftTemplates, data.ptTemplates, data.prefCode, monthsMeta, data.ftThresholds
        ).schedule;
      }

      setSchedule(finalSchedule);
      setMsg(r4.message);
      setRunning(false);
    }, 30);
  };

  const clearAll = () => {
    if (!window.confirm(`${meta.label} 스케줄을 전부 지울까요?`)) return;
    setSchedule((prev) => {
      const next = { ...prev, [monthKey]: {} };
      data.employees.forEach((e) => { next[monthKey][e.id] = Array(meta.days.length).fill(""); });
      return next;
    });
    setMsg(null);
  };

  const archiveKey = meta.days.length ? meta.days[0].dateStr.slice(0, 7) : null;
  const alreadyArchived = archive && archiveKey && !!archive[archiveKey];

  const saveToArchive = () => {
    if (!archiveKey) return;
    if (alreadyArchived && !window.confirm(`${meta.label} 기록이 이미 저장되어 있습니다. 지금 내용으로 덮어쓸까요?`)) return;
    const employeesSnapshot = data.employees.map((e) => ({ id: e.id, name: e.name, type: e.type }));
    const memoKey = monthKey === "m1" ? "m1Memo" : "m2Memo";
    const memoRowLabels = data.memoRowLabels || [];
    setArchive((prev) => ({
      ...(prev || {}),
      [archiveKey]: {
        savedAt: new Date().toISOString(),
        label: meta.label,
        days: meta.days,
        employeesSnapshot,
        schedule: schedule[monthKey],
        memoRowLabels,
        memo: schedule[memoKey] || {},
      },
    }));
    setMsg(`${meta.label} 기록을 저장했습니다. 왼쪽 [월별기록] 탭에서 확인할 수 있습니다.`);
  };

  const val = useMemo(() => validateMonth(schedule, data.employees, data.tags, data.settings, meta.days, monthKey, data.fixedRestSchedules, data.dayPairOptions), [schedule, data, meta, monthKey]);

  return (
    <div>
      {locked && <ReadOnlyNotice>이 화면은 열람만 가능합니다. 자동배정 실행과 스케줄 수정은 매장관리자 이상만 할 수 있습니다.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <PrimaryBtn onClick={runRestDays} disabled={running} icon={PlayCircle}>1단계: 휴무/휴일 자동배정</PrimaryBtn>
        <PrimaryBtn onClick={runShiftCodes} disabled={running} icon={Sparkles}>2단계: 근무 자동배정</PrimaryBtn>
        <PrimaryBtn onClick={runRemainingRest} disabled={running} icon={CheckCircle2}>3단계: 잔여 휴무/휴일 배정</PrimaryBtn>
        <PrimaryBtn onClick={runFinalAdjust} disabled={running} icon={Sparkles}>4단계: 최종 조율</PrimaryBtn>
        <GhostBtn onClick={clearAll} icon={Trash2}>이 달 전체 지우기</GhostBtn>
        <GhostBtn onClick={saveToArchive} icon={Archive}>{alreadyArchived ? "기록 다시 저장" : "기록으로 저장"}</GhostBtn>
        {running && <Loader2 className="animate-spin text-indigo-500" size={18} />}
      </div>
      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-md px-3 py-2 mb-3 whitespace-pre-wrap">{msg}</div>
      )}
      <div className="flex gap-4 mb-3 text-xs flex-wrap">
        <span className={`px-2 py-1 rounded-md font-semibold ${val.notOkCount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          최소인원 미달: {val.notOkCount}건
        </span>
        {data.settings?.leaderMinEnabled && (
          <span className={`px-2 py-1 rounded-md font-semibold ${val.leaderNotOkCount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            리더 최소인원 미달: {val.leaderNotOkCount}건
          </span>
        )}
        <span className={`px-2 py-1 rounded-md font-semibold ${val.warnList.length > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          연속근무 상한 초과: {val.warnList.length === 0 ? "없음" : val.warnList.join(", ")}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-3 text-xs flex-wrap bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
        <span className="text-slate-500 font-semibold">인원 필터</span>
        <DateInput value={filterDate} onChange={setFilterDate} />
        <Select
          value={filterMode} onChange={setFilterMode}
          options={[
            { value: "all", label: "전체" },
            { value: "working", label: "출근만" },
            { value: "off", label: "휴무·휴일만" },
            ...ftCodeOptions.map((c) => ({ value: c, label: `근무조: ${c}` })),
          ]}
          className="w-32"
        />
        {filterDate && (
          <button onClick={() => { setFilterDate(""); setFilterMode("all"); }} className="text-slate-400 hover:text-red-500">필터 해제</button>
        )}
        <span className="text-[11px] text-slate-400">기준일을 고르면 그날 조건에 맞는 인원만 표에 남습니다(열은 그대로 전체 표시).</span>
      </div>
      <ScheduleGrid
        data={data} setData={setData} schedule={schedule} setSchedule={setSchedule} monthKey={monthKey} days={meta.days} priorMonthCarry={priorMonthCarry}
        filterDate={filterDate} filterMode={filterMode}
      />
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   2개월 요약 탭
   ============================================================ */
function SummaryTab({ data, schedule, monthsMeta }) {
  // 자동배정 대상만 집계 (지원/스위칭 근무자는 목표 자체가 없음)
  const active = data.employees.filter((e) => e.type === "정직원" && isActiveEmployee(e) && isAutoAssignable(e));
  const monthTargets = monthsMeta.map((m) => ({
    label: m.label,
    humu: satTarget(m.days),
    hyuil: sunHolTarget(m.days),
  }));
  const targetHumu = monthTargets.reduce((s, m) => s + m.humu, 0);
  const targetHyuil = monthTargets.reduce((s, m) => s + m.hyuil, 0);
  const target = targetHumu + targetHyuil;

  const combinedWarn = validateCombined(schedule, data.employees, data.tags, data.settings, monthsMeta, data.fixedRestSchedules, data.dayPairOptions);

  const rows = active.map((e) => {
    const counts = { m1: { humu: 0, hyuil: 0 }, m2: { humu: 0, hyuil: 0 } };
    monthsMeta.forEach(({ key }) => {
      (schedule[key][e.id] || []).forEach((v) => {
        if (v === "휴무") counts[key].humu++;
        if (v === "휴일") counts[key].hyuil++;
      });
    });
    const totalHumu = counts.m1.humu + counts.m2.humu;
    const totalHyuil = counts.m1.hyuil + counts.m2.hyuil;
    const total = totalHumu + totalHyuil;
    // 인턴처럼 수기 목표(restTargetM1/M2)가 있으면 매장 공통 목표 대신 그 값으로 검증한다
    let empTargetHumu = 0, empTargetHyuil = 0;
    monthsMeta.forEach((m) => {
      const t = restTargetFor(e, m.key, m.days);
      empTargetHumu += t.humu; empTargetHyuil += t.hyuil;
    });
    const empTarget = empTargetHumu + empTargetHyuil;
    return {
      ...e, counts, total, empTarget,
      diffHumu: totalHumu - empTargetHumu,
      diffHyuil: totalHyuil - empTargetHyuil,
      diff: total - empTarget,
    };
  });

  return (
    <div className="max-w-5xl">
      <SectionCard title="2개월 목표" icon={CheckCircle2}>
        <div className="text-sm mb-3">
          2개월 목표 합계 (인당 배정일수): <b className="text-indigo-600 text-lg">{target}일</b>
          <span className="text-slate-400 ml-2">(휴무 {targetHumu}일 + 휴일 {targetHyuil}일)</span>
        </div>
        <div className="flex gap-4 flex-wrap">
          {monthTargets.map((m, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm">
              <div className="font-semibold text-slate-700">{m.label}</div>
              <div className="text-slate-500 text-xs mt-1">휴무 <b className="text-indigo-600">{m.humu}일</b> · 휴일 <b className="text-indigo-600">{m.hyuil}일</b></div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="인당 휴무/휴일 현황" icon={ClipboardList}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2">이름</th><th>구분</th>
              <th>1개월 휴무</th><th>1개월 휴일</th><th>2개월 휴무</th><th>2개월 휴일</th>
              <th>목표대비휴무</th><th>목표대비휴일</th>
              <th>총합계</th><th>개인목표</th><th>목표대비</th><th>검증</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-1.5 font-medium">{r.name}</td>
                <td>{r.type}</td>
                <td className="text-center">{r.counts.m1.humu}</td>
                <td className="text-center">{r.counts.m1.hyuil}</td>
                <td className="text-center">{r.counts.m2.humu}</td>
                <td className="text-center">{r.counts.m2.hyuil}</td>
                <td className="text-center">{r.diffHumu}</td>
                <td className="text-center">{r.diffHyuil}</td>
                <td className="text-center font-bold">{r.total}</td>
                <td className="text-center text-slate-400">{r.empTarget}</td>
                <td className="text-center">{r.diff}</td>
                <td className="text-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${r.diff === 0 ? "bg-green-100 text-green-700" : r.diff < 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {r.diff === 0 ? "OK" : r.diff < 0 ? "부족" : "초과"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <SectionCard title="2개월 전체 연속근무 초과" icon={AlertTriangle}>
        <p className="text-sm">{combinedWarn.length === 0 ? "없음" : combinedWarn.join(", ")}</p>
      </SectionCard>
    </div>
  );
}

/* ============================================================
   월별기록 탭 (최근 1년치 스냅샷 조회/수정)
   ============================================================ */
function monthsOfYear(year) {
  const arr = [];
  for (let m = 1; m <= 12; m++) {
    arr.push({ key: `${year}-${String(m).padStart(2, "0")}`, label: `${m}월` });
  }
  return arr;
}

function ArchiveTab({ data, archive, setArchive, role }) {
  const locked = role === "viewer";
  const [year, setYear] = useState(data.settings?.year || new Date().getFullYear());
  const months = useMemo(() => monthsOfYear(year), [year]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const selected = `${year}-${String(selectedMonth).padStart(2, "0")}`;
  const entry = archive[selected];

  const allCodes = useMemo(() => {
    const set = new Set(["", ...data.tags.map((t) => t.code)]);
    data.ftTemplates.forEach((t) => t.code && set.add(t.code));
    data.ptTemplates.forEach((t) => t.code && set.add(t.code));
    return Array.from(set);
  }, [data]);

  const setCell = (empId, dayIdx, value) => {
    setArchive((prev) => {
      const next = { ...prev };
      const ent = { ...next[selected] };
      const sched = { ...ent.schedule };
      const arr = [...(sched[empId] || [])];
      arr[dayIdx] = value;
      sched[empId] = arr;
      ent.schedule = sched;
      next[selected] = ent;
      return next;
    });
  };

  const setArchiveMemoCell = (rowId, dayIdx, value) => {
    setArchive((prev) => {
      const next = { ...prev };
      const ent = { ...next[selected] };
      const memo = { ...(ent.memo || {}) };
      const arr = [...(memo[rowId] || [])];
      arr[dayIdx] = value;
      memo[rowId] = arr;
      ent.memo = memo;
      next[selected] = ent;
      return next;
    });
  };

  const deleteEntry = () => {
    if (!window.confirm(`${year}년 ${selectedMonth}월 기록을 삭제할까요? 이 기록은 [연차현황]·[시프티코드변환]의 "월별기록" 계산에도 쓰이므로, 삭제하면 그 계산에서도 빠집니다. 되돌릴 수 없습니다.`)) return;
    setArchive((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
  };

  return (
    <div>
      <SectionCard title="연도 · 월 선택" icon={CalendarDays}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-500">연도</span>
            <NumberInput value={year} onChange={(v) => setYear(v || new Date().getFullYear())} className="w-24" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-500">월</span>
            <Select
              value={selectedMonth}
              onChange={(v) => setSelectedMonth(Number(v))}
              options={months.map((m, i) => ({ value: i + 1, label: m.label }))}
              className="w-24"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          [스케줄 1·2개월차] 화면에서 "기록으로 저장" 버튼을 누르면 그 시점의 스케줄이 해당 연도·월에 남습니다.
        </p>
      </SectionCard>

      {!entry ? (
        <div className="text-sm text-slate-400 py-16 text-center">{year}년 {selectedMonth}월은 아직 저장된 기록이 없습니다.</div>
      ) : (
        <ReadOnlyFence locked={locked}>
        <SectionCard
          title={`${year}년 ${selectedMonth}월 기록`}
          icon={Archive}
          right={
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">저장 시각: {entry.savedAt ? new Date(entry.savedAt).toLocaleString("ko-KR") : "-"}</span>
              {!locked && (
                <button onClick={deleteEntry} className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                  <Trash2 size={12} /> 이 달 기록 삭제
                </button>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="text-xs border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 132, maxWidth: 132 }} className="sticky left-0 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left z-10">이름</th>
                  {entry.days.map((day) => (
                    <th key={day.day} style={{ minWidth: 54, maxWidth: 54 }} className="border border-slate-200 px-1 py-1.5 font-semibold">
                      {day.day}<br /><span className="font-normal">{day.weekday}</span>
                    </th>
                  ))}
                </tr>
                {(entry.memoRowLabels || []).map((row) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 bg-amber-50 border border-slate-200 px-2 py-1 text-[10px] text-amber-700 font-semibold z-10">{row.label}</td>
                    {entry.days.map((day, i) => (
                      <td key={day.day} className="border border-slate-200 p-0 bg-amber-50/40 align-top">
                        <AutoGrowTextarea
                          value={(entry.memo?.[row.id] || [])[i] || ""}
                          onChange={(v) => setArchiveMemoCell(row.id, i, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {entry.employeesSnapshot.map((e) => (
                  <tr key={e.id}>
                    <td className="sticky left-0 bg-white border border-slate-200 px-2 py-1 font-medium z-10">{e.name}</td>
                    {entry.days.map((day, i) => (
                      <td key={day.day} className="border border-slate-200 p-0">
                        <select
                          value={(entry.schedule[e.id] || [])[i] || ""}
                          onChange={(ev) => setCell(e.id, i, ev.target.value)}
                          className="w-full h-full text-[10px] text-center border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1.5"
                        >
                          {allCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {locked ? "이 기록은 열람만 가능합니다. 수정이 필요하면 매장관리자 이상에게 요청하세요." : "여기서 수정한 내용은 자동으로 저장됩니다."}
          </p>
        </SectionCard>
        </ReadOnlyFence>
      )}
    </div>
  );
}

/* ============================================================
   연차현황 탭 - 태그 기반 자동 집계 (연차/반차/반반차/안식휴가 등)
   ============================================================ */
function formatDaysHours(hours) {
  const days = hours / 8;
  const daysStr = Number.isInteger(days) ? String(days) : days.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${daysStr}일 (${hours}H)`;
}

function LeaveTab({ data, setData, archive, role }) {
  const locked = role === "viewer";
  const [year, setYear] = useState(data.settings?.year || new Date().getFullYear());

  const usage = useMemo(
    () => computeLeaveUsage(year, data.tags, archive || {}),
    [year, data.tags, archive]
  );

  const leaveTags = data.tags.filter((t) => t.trackAsLeave);
  // 연차추적 태그들을 "연차종류"별로 묶기 (등장 순서 유지)
  const pools = [];
  leaveTags.forEach((t) => {
    const poolName = t.leavePool || "연차";
    if (!pools.includes(poolName)) pools.push(poolName);
  });

  const grantsByYear = (data.annualLeaveGrants && data.annualLeaveGrants[year]) || {}; // { poolName: { empId: 일수 } }

  const setGrant = (poolName, empId, val) => {
    setData((d) => {
      const cur = d.annualLeaveGrants || {};
      const yearMap = { ...(cur[year] || {}) };
      const poolMap = { ...(yearMap[poolName] || {}), [empId]: val };
      yearMap[poolName] = poolMap;
      return { ...d, annualLeaveGrants: { ...cur, [year]: yearMap } };
    });
  };

  const activeEmps = data.employees.filter((e) => isActiveEmployee(e));

  if (leaveTags.length === 0) {
    return (
      <div className="max-w-3xl">
        <SectionCard title="연차 사용 현황" icon={PieChart}>
          <p className="text-sm text-slate-500">
            아직 "연차추적"이 켜진 태그가 없습니다. [태그목록] 탭에서 연차/반차/반반차 같은 태그의 "연차추적"을 켜고 시간(H)을 지정해주세요.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <SectionCard title="연도 선택" icon={CalendarDays}>
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-500">연도</span>
          <NumberInput value={year} onChange={(v) => setYear(v || new Date().getFullYear())} className="w-24" />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          [월별기록]에 "기록으로 저장"해둔 데이터만 기준으로 계산합니다. 스케줄 1·2개월차에서 아직 저장하지 않은 진행중인 내용은 반영되지 않으니,
          연차 사용이 확정되면 [스케줄 1·2개월차]에서 "기록으로 저장"을 눌러 남겨주세요. (진행중인 스케줄을 지우거나 수정해도 이미 저장된 기록에는 영향 없습니다.)
          보유량은 "일" 단위로 입력하면 1일=8시간 기준으로 환산되어, 반차·반반차를 섞어 써도 자동으로 정확히 계산됩니다.
          연차종류(예: 연차 / 리프레시·안식휴가)는 [태그목록]에서 태그마다 지정합니다.
        </p>
      </SectionCard>

      {locked && <ReadOnlyNotice>연차 보유량 입력은 매장관리자 이상만 할 수 있습니다.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      {pools.map((poolName) => {
        const poolTags = leaveTags.filter((t) => (t.leavePool || "연차") === poolName);
        const grants = grantsByYear[poolName] || {};
        return (
          <SectionCard key={poolName} title={`${year}년 "${poolName}" 사용 현황`} icon={PieChart}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2">이름</th>
                  <th>보유(일)</th>
                  <th>사용</th>
                  <th>잔여</th>
                  <th>소진율</th>
                  {poolTags.map((t) => <th key={t.id}>{t.code} 사용일</th>)}
                </tr>
              </thead>
              <tbody>
                {activeEmps.map((e) => {
                  const u = usage[e.id]?.byPool?.[poolName];
                  const usedHours = u?.totalHours || 0;
                  const grantDays = Number(grants[e.id]) || 0;
                  const grantHours = grantDays * 8;
                  const remainHours = grantHours - usedHours;
                  const pct = grantHours > 0 ? Math.round((usedHours / grantHours) * 100) : 0;
                  return (
                    <tr key={e.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 font-medium whitespace-nowrap">{e.name}</td>
                      <td className="py-2">
                        <NumberInput value={grants[e.id] ?? ""} onChange={(v) => setGrant(poolName, e.id, v)} className="w-20" />
                      </td>
                      <td className="py-2 whitespace-nowrap">{formatDaysHours(usedHours)}</td>
                      <td className="py-2 whitespace-nowrap">{grantDays ? formatDaysHours(remainHours) : "-"}</td>
                      <td className="py-2">
                        {grantHours > 0 ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${pct >= 100 ? "bg-red-100 text-red-700" : pct >= 70 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {pct}%
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      {poolTags.map((t) => {
                        const dates = u?.byTag?.[t.code]?.dates || [];
                        return (
                          <td key={t.id} className="py-2 text-[11px] text-slate-600 max-w-[200px]">
                            {dates.length === 0 ? <span className="text-slate-300">-</span> : dates.map((d) => d.slice(5).replace("-", "/")).join(", ")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>
        );
      })}
      </ReadOnlyFence>
    </div>
  );
}

/* ============================================================
   시프티 코드 변환표 탭 - 우리 코드 ↔ 외부 시스템(시프티) 코드 매핑 + 변환 미리보기
   ============================================================ */
function ShiftyMapTab({ data, setData, schedule, archive, monthsMeta, role, currentStoreId, storeList }) {
  const locked = role === "viewer";
  const isAdmin = role === "admin";
  const map = data.shiftyCodeMap || [];
  const updMap = (i, patch) => setData((d) => { const a = [...(d.shiftyCodeMap || [])]; a[i] = { ...a[i], ...patch }; return { ...d, shiftyCodeMap: a }; });
  const rmMap = (i) => setData((d) => ({ ...d, shiftyCodeMap: (d.shiftyCodeMap || []).filter((_, idx) => idx !== i) }));
  const addMap = () => setData((d) => ({ ...d, shiftyCodeMap: [...(d.shiftyCodeMap || []), { code: "", shiftyCode: "" }] }));

  const [source, setSource] = useState("m1"); // m1 | m2 | both | archive
  const [archiveYear, setArchiveYear] = useState(data.settings?.year || new Date().getFullYear());
  const [archiveMonth, setArchiveMonth] = useState(new Date().getMonth() + 1);
  const [copyMsg, setCopyMsg] = useState("");

  const archiveKey = `${archiveYear}-${String(archiveMonth).padStart(2, "0")}`;
  const archiveEntry = source === "archive" ? (archive || {})[archiveKey] : null;

  // 1개월차/2개월차/(둘 다 이어붙인) "양쪽" 을 한 로직으로 처리
  const m1 = monthsMeta.find((m) => m.key === "m1");
  const m2 = monthsMeta.find((m) => m.key === "m2");
  let days, scheduleByEmpList; // scheduleByEmpList: [{key, days}] 형태로 이어붙일 구간들
  if (source === "archive") {
    days = archiveEntry?.days || [];
    scheduleByEmpList = [{ key: "archive", days }];
  } else if (source === "both") {
    days = [...(m1?.days || []), ...(m2?.days || [])];
    scheduleByEmpList = [{ key: "m1", days: m1?.days || [] }, { key: "m2", days: m2?.days || [] }];
  } else {
    const meta = monthsMeta.find((m) => m.key === source);
    days = meta?.days || [];
    scheduleByEmpList = [{ key: source, days: meta?.days || [] }];
  }
  const employeesList = source === "archive" ? (archiveEntry?.employeesSnapshot || []) : data.employees.filter((e) => isActiveEmployee(e));

  const codeAt = (empId, segIdx) => {
    // segIdx: days 배열 안에서의 순번 -> 어느 구간(m1/m2/archive)의 몇 번째 칸인지 환산해서 값을 찾는다
    let offset = 0;
    for (const seg of scheduleByEmpList) {
      if (segIdx < offset + seg.days.length) {
        const localIdx = segIdx - offset;
        const arr = seg.key === "archive" ? (archiveEntry?.schedule?.[empId] || []) : (schedule[seg.key]?.[empId] || []);
        return arr[localIdx] || "";
      }
      offset += seg.days.length;
    }
    return "";
  };

  // 날짜문자열로 직접 찾기 (엑셀 자동채우기용 - m1/m2를 합쳐서 검색)
  const codeByDate = (empId, dateStr) => {
    for (const m of [m1, m2]) {
      if (!m) continue;
      const idx = m.days.findIndex((d) => d.dateStr === dateStr);
      if (idx !== -1) return (schedule[m.key]?.[empId] || [])[idx] || "";
    }
    return "";
  };

  const convert = (v) => {
    if (!v) return "";
    const m = map.find((x) => x.code === v);
    return m ? m.shiftyCode : v;
  };

  const rowText = (e) => [e.name, ...days.map((_, i) => convert(codeAt(e.id, i)))].join("\t");

  const copyGrid = async () => {
    const header = ["이름", ...days.map((d) => `${d.day}(${d.weekday})`)].join("\t");
    const text = [header, ...employeesList.map(rowText)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("전체 표가 복사되었습니다.");
    } catch (e) {
      setCopyMsg("복사에 실패했습니다. 표를 직접 드래그해서 복사해주세요.");
    }
    setTimeout(() => setCopyMsg(""), 3000);
  };

  const copyRow = async (e) => {
    try {
      await navigator.clipboard.writeText(rowText(e));
      setCopyMsg(`"${e.name}" 행이 복사되었습니다.`);
    } catch (err) {
      setCopyMsg("복사에 실패했습니다.");
    }
    setTimeout(() => setCopyMsg(""), 2500);
  };

  /* ---------- 전체 매장에 코드 변환표 동일 적용 (총관리자 전용) ---------- */
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const syncMappingToAllStores = async () => {
    if (!window.confirm(`이 매장의 코드 변환표를 나머지 ${(storeList?.length || 1) - 1}개 매장에도 동일하게 적용할까요? 각 매장의 코드 변환표만 덮어씁니다.`)) return;
    setSyncBusy(true);
    setSyncMsg("");
    let ok = 0, fail = 0;
    try {
      const others = (storeList || []).filter((s) => s.id !== currentStoreId);
      for (const s of others) {
        try {
          const cfg = await api.getConfig(s.id);
          await api.putConfig(s.id, { ...cfg, shiftyCodeMap: map });
          ok++;
        } catch (e) { fail++; }
      }
      setSyncMsg(`완료: ${ok}개 매장 적용${fail > 0 ? `, 실패 ${fail}개` : ""}`);
    } finally {
      setSyncBusy(false);
    }
  };

  /* ---------- 엑셀 자동 채우기 ---------- */
  const fsaSupported = isFileSystemAccessSupported();
  const [dirConnected, setDirConnected] = useState(false);
  const [dirName, setDirName] = useState("");
  const [fillBusy, setFillBusy] = useState(false);
  const [fillResult, setFillResult] = useState(null); // { fileName, filledCount, matched, unmatched }
  const [fillError, setFillError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!fsaSupported) return;
    (async () => {
      const handle = await loadDirHandle().catch(() => null);
      if (handle) {
        const ok = await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied");
        setDirConnected(ok === "granted" || ok === "prompt");
        setDirName(handle.name || "");
      }
    })();
  }, [fsaSupported]);

  const connectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ id: "shiftee-downloads", startIn: "downloads" });
      await saveDirHandle(handle);
      setDirConnected(true);
      setDirName(handle.name || "");
      setFillError("");
    } catch (e) {
      // 사용자가 취소한 경우 등은 조용히 무시
    }
  };

  const disconnectFolder = async () => {
    await clearDirHandle();
    setDirConnected(false);
    setDirName("");
  };

  async function findLatestShifteeFile(dirHandle) {
    let latest = null;
    for await (const [name, entryHandle] of dirHandle.entries()) {
      if (entryHandle.kind !== "file") continue;
      if (!/^shiftee-schedule-.*\.xlsx$/i.test(name)) continue;
      const file = await entryHandle.getFile();
      if (!latest || file.lastModified > latest.file.lastModified) {
        latest = { name, handle: entryHandle, file };
      }
    }
    return latest;
  }

  const runFill = async (arrayBuffer, fileName, saveBack) => {
    const wb = readWorkbook(arrayBuffer);
    const result = fillWorkbook(wb, {
      employees: data.employees,
      getOurCode: codeByDate,
      convertCode: convert,
    });
    const outBuffer = workbookToArrayBuffer(wb);
    const outName = outputFileName(fileName);
    await saveBack(outBuffer, outName);
    setFillResult({
      fileName: outName,
      filledCount: result.filledCount,
      matched: result.matchedEmployees.length,
      unmatched: result.unmatchedRows,
      period: result.period,
    });
  };

  const loadAndFillFromFolder = async () => {
    setFillBusy(true); setFillError(""); setFillResult(null);
    try {
      const handle = await loadDirHandle();
      if (!handle) { setFillError("연결된 폴더가 없습니다. 먼저 폴더를 연결하세요."); return; }
      const granted = await ensurePermission(handle, "readwrite");
      if (!granted) { setFillError("폴더 접근 권한이 거부되었습니다."); return; }
      const latest = await findLatestShifteeFile(handle);
      if (!latest) { setFillError('연결한 폴더에서 "shiftee-schedule-*.xlsx" 파일을 찾지 못했습니다.'); return; }
      const buf = await latest.file.arrayBuffer();
      await runFill(buf, latest.name, async (outBuffer, outName) => {
        const outHandle = await handle.getFileHandle(outName, { create: true });
        const writable = await outHandle.createWritable();
        await writable.write(outBuffer);
        await writable.close();
      });
    } catch (e) {
      setFillError("처리 중 오류가 발생했습니다: " + e.message);
    } finally {
      setFillBusy(false);
    }
  };

  const pickFileFallback = () => fileInputRef.current?.click();

  const handleFileFallback = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setFillBusy(true); setFillError(""); setFillResult(null);
    try {
      const buf = await file.arrayBuffer();
      await runFill(buf, file.name, async (outBuffer, outName) => {
        const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = outName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      setFillError("처리 중 오류가 발생했습니다: " + e.message);
    } finally {
      setFillBusy(false);
    }
  };

  return (
    <div className="max-w-6xl">
      {locked && <ReadOnlyNotice>코드 변환표 수정은 매장관리자 이상만 할 수 있습니다. 아래 "변환 미리보기"·"엑셀 자동 채우기"는 누구나 이용할 수 있습니다.</ReadOnlyNotice>}
      <ReadOnlyFence locked={locked}>
      <SectionCard
        title="코드 변환표"
        icon={FileSpreadsheet}
        right={
          <div className="flex items-center gap-2">
            {isAdmin && <GhostBtn onClick={syncMappingToAllStores} icon={FolderCog}>{syncBusy ? "적용 중..." : "전체 매장에 동일 적용"}</GhostBtn>}
            <GhostBtn onClick={addMap} icon={Plus}>매핑 추가</GhostBtn>
          </div>
        }
      >
        <p className="text-xs text-slate-500 mb-3">우리 시스템 코드를 시프티(또는 다른 외부 시스템) 코드로 바꿔서 내보낼 때 쓸 대응표입니다. 매핑이 없는 코드는 원래 값 그대로 나갑니다.</p>
        {syncMsg && <p className="text-xs text-indigo-600 mb-2">{syncMsg}</p>}
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 w-1/3">우리 코드</th>
              <th className="py-2 w-1/3">시프티 코드</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {map.map((m, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1"><TextInput value={m.code} onChange={(v) => updMap(i, { code: v })} className="w-40" /></td>
                <td><TextInput value={m.shiftyCode} onChange={(v) => updMap(i, { shiftyCode: v })} className="w-40" /></td>
                <td><IconBtn onClick={() => rmMap(i)} danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      </ReadOnlyFence>

      <SectionCard
        title="변환 미리보기"
        icon={Copy}
        right={<PrimaryBtn onClick={copyGrid} icon={Copy}>표 전체 복사</PrimaryBtn>}
      >
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Select
            value={source} onChange={setSource}
            options={[
              { value: "m1", label: "스케줄 1개월차" },
              { value: "m2", label: "스케줄 2개월차" },
              { value: "both", label: "양쪽 (2개월 전체)" },
              { value: "archive", label: "월별기록" },
            ]}
            className="w-44"
          />
          {source === "archive" && (
            <>
              <NumberInput value={archiveYear} onChange={(v) => setArchiveYear(v || new Date().getFullYear())} className="w-20" />
              <Select value={archiveMonth} onChange={(v) => setArchiveMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` }))} className="w-20" />
            </>
          )}
          {copyMsg && <span className="text-xs text-indigo-600">{copyMsg}</span>}
        </div>
        <p className="text-[11px] text-slate-400 mb-3">각 행 왼쪽의 복사 아이콘을 누르면 그 직원의 날짜별 코드만 탭(TAB) 구분으로 복사됩니다 — 시프티 엑셀에서 그 사람 행에 바로 붙여넣기 좋습니다.</p>

        {days.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">{source === "archive" ? "선택한 달의 저장된 기록이 없습니다." : "표시할 스케줄이 없습니다."}</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="text-xs border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 34, maxWidth: 34 }} className="sticky left-0 bg-slate-100 border border-slate-200 z-10"></th>
                  <th style={{ minWidth: 110, maxWidth: 110 }} className="sticky left-[34px] bg-slate-100 border border-slate-200 px-2 py-1.5 text-left z-10">이름</th>
                  {days.map((day, i) => (
                    <th key={i} style={{ minWidth: 50, maxWidth: 50 }} className="border border-slate-200 px-1 py-1.5 font-semibold">
                      {day.day}<br /><span className="font-normal">{day.weekday}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeesList.map((e) => (
                  <tr key={e.id}>
                    <td style={{ minWidth: 34, maxWidth: 34 }} className="sticky left-0 bg-white border border-slate-200 text-center z-10">
                      <button onClick={() => copyRow(e)} title={`${e.name} 행 복사`} className="text-slate-400 hover:text-indigo-600 p-0.5">
                        <Copy size={12} />
                      </button>
                    </td>
                    <td style={{ minWidth: 110, maxWidth: 110 }} className="sticky left-[34px] bg-white border border-slate-200 px-2 py-1 font-medium z-10">{e.name}</td>
                    {days.map((day, i) => (
                      <td key={i} className="border border-slate-200 px-1 py-1 text-center">{convert(codeAt(e.id, i))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="엑셀 자동 채우기" icon={HardDriveDownload}>
        <p className="text-xs text-slate-500 mb-3">
          다운로드 폴더에 있는 시프티 업로드용 엑셀 파일(<code className="bg-slate-100 px-1 rounded">shiftee-schedule-*.xlsx</code>)을 열어서,
          변환된 코드를 사원번호 기준으로 자동으로 채워 넣고 <code className="bg-slate-100 px-1 rounded">-변환완료</code> 파일로 저장합니다.
          직원목록에 사원번호가 입력되어 있어야 정확히 매칭됩니다(동명이인 방지).
        </p>

        {fsaSupported ? (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {dirConnected ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                  <FolderCheck size={13} /> 폴더 연결됨{dirName ? ` (${dirName})` : ""}
                </span>
                <GhostBtn onClick={connectFolder} icon={FolderCog}>다른 폴더로 변경</GhostBtn>
                <button onClick={disconnectFolder} className="text-xs text-slate-400 hover:text-red-500 px-2">연결 해제</button>
                <PrimaryBtn onClick={loadAndFillFromFolder} disabled={fillBusy} icon={HardDriveDownload}>
                  {fillBusy ? "처리 중..." : "최신 파일 불러오기 → 변환 저장"}
                </PrimaryBtn>
              </>
            ) : (
              <GhostBtn onClick={connectFolder} icon={FolderCog}>다운로드 폴더 연결</GhostBtn>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-600 mb-3">이 브라우저는 폴더 자동 연결을 지원하지 않습니다(크롬/엣지에서 가능). 아래에서 파일을 직접 선택해주세요.</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <GhostBtn onClick={pickFileFallback} icon={Upload}>파일 선택해서 변환 (다운로드로 저장)</GhostBtn>
          <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileFallback} className="hidden" />
          {fillBusy && <Loader2 className="animate-spin text-indigo-500" size={16} />}
        </div>

        {fillError && <p className="text-xs text-red-600 mt-3">{fillError}</p>}
        {fillResult && (
          <div className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 space-y-1">
            <p className="text-emerald-700 font-semibold">"{fillResult.fileName}" 로 저장 완료 (기간 {fillResult.period?.start} ~ {fillResult.period?.end})</p>
            <p>매칭된 직원 {fillResult.matched}명 · 채운 칸 {fillResult.filledCount}개</p>
            {fillResult.unmatched.length > 0 && (
              <p className="text-amber-700">매칭 안 된 행: {fillResult.unmatched.map((u) => u.name || u.empNo).join(", ")} — 사원번호/이름을 직원목록과 맞춰주세요.</p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ============================================================
   메인 앱
   ============================================================ */
// 왼쪽 메뉴를 "설정"(매장 셋업·구성)과 "스케줄"(실제 확인·운영)로 폴더처럼 나눈다.
const TAB_GROUPS = [
  {
    label: "설정",
    tabs: [
      { key: "settings", label: "설정", icon: Settings },
      { key: "employees", label: "직원목록", icon: Users },
      { key: "tags", label: "태그목록", icon: Tag },
      { key: "holidays", label: "공휴일·이슈일", icon: CalendarDays },
      { key: "templates", label: "근무형태템플릿", icon: ClipboardCheck },
      { key: "shifty", label: "시프티코드변환", icon: FileSpreadsheet },
    ],
  },
  {
    label: "스케줄",
    tabs: [
      { key: "requests", label: "요청", icon: Tag },
      { key: "m1", label: "스케줄 1개월차", icon: ClipboardList },
      { key: "m2", label: "스케줄 2개월차", icon: ClipboardList },
      { key: "summary", label: "2개월요약", icon: CheckCircle2 },
      { key: "archive", label: "월별기록", icon: Archive },
      { key: "leave", label: "연차현황", icon: PieChart },
    ],
  },
];
// "설정" 그룹은 매장 세팅용 화면이라 사용자(뷰어)는 볼 필요가 없다 - "개인 지정 태그"(요청)만
// [공휴일·이슈일]에서 분리해 "스케줄" 그룹의 "요청" 탭으로 옮겨뒀으므로, 설정 그룹을 통째로
// 숨겨도 사용자가 본인 휴무 요청을 등록하는 기능은 그대로 유지된다.
const VIEWER_TAB_GROUPS = TAB_GROUPS.filter((g) => g.label !== "설정");
const TABS = TAB_GROUPS.flatMap((g) => g.tabs);

function groupedStoreOptions(storeList) {
  const map = new Map();
  storeList.forEach((s) => {
    const g = (s.group || "").trim() || "미분류";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(s);
  });
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    if (a[0] === "미분류") return 1;
    if (b[0] === "미분류") return -1;
    return a[0].localeCompare(b[0], "ko");
  });
  entries.forEach(([, list]) => list.sort((a, b) => a.name.localeCompare(b.name, "ko")));
  return entries;
}

function MainApp({ role, onLogout }) {
  const [storeList, setStoreList] = useState(null);
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [data, setDataRaw] = useState(null);
  const [schedule, setScheduleRaw] = useState(null);
  const [archive, setArchiveRaw] = useState(null);
  const [tab, setTab] = useState("settings");
  // 사용자(뷰어)는 "설정" 그룹 탭을 아예 볼 수 없으므로, 혹시 거기 있던 탭이 선택된 채로
  // 뷰어 권한이 되면(처음 진입 포함) 스케줄 그룹의 첫 화면으로 옮겨준다.
  useEffect(() => {
    if (role === "viewer" && !VIEWER_TAB_GROUPS.some((g) => g.tabs.some((t) => t.key === tab))) {
      setTab("m1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const saveTick = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listStores();
        setStoreList(list);
        if (list.length > 0) setCurrentStoreId(list[0].id);
      } catch (e) {
        setStoreList([]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!currentStoreId) { setDataRaw(null); setScheduleRaw(null); setArchiveRaw(null); return; }
    (async () => {
      setLoading(true);
      knownUpdatedAt.current = null;
      setExternalChange(false);
      try {
        const [cfg, sched, arch, meta] = await Promise.all([
          api.getConfig(currentStoreId),
          api.getSchedule(currentStoreId),
          api.getArchive(currentStoreId).catch(() => ({})),
          api.getMeta(currentStoreId).catch(() => ({ updatedAt: 0 })),
        ]);
        const finalData = cfg || defaultStoreData();
        finalData.ftTemplates = normalizeFtTemplates(finalData.ftTemplates);
        // 기존 매장은 인원별 restMode가 없다 - 매장의 기존 restMode를 그대로 채워 넣어 배포 직후 동작이 안 바뀌게 한다
        finalData.employees = normalizeEmployeeRestModes(finalData.employees, finalData.settings);
        finalData.fixedRestSchedules = finalData.fixedRestSchedules || [];
        finalData.memoRowLabels = finalData.memoRowLabels || [];
        finalData.dayPairOptions = finalData.dayPairOptions || DEFAULT_DAY_PAIR_OPTIONS;
        setDataRaw(finalData);
        const s1 = finalData.settings;
        const { year: y2, month: m2 } = nextMonth(s1.year, s1.startMonth);
        const days1 = buildMonthDays(s1.year, s1.startMonth, finalData.holidays, finalData.issueDays);
        const days2 = buildMonthDays(y2, m2, finalData.holidays, finalData.issueDays);
        const empSched = reconcileSchedule(sched, finalData.employees, days1, days2);
        const memoSched = reconcileMemoRows(sched, finalData.memoRowLabels, days1, days2);
        setScheduleRaw({ ...empSched, m1Memo: memoSched.m1Memo, m2Memo: memoSched.m2Memo });
        setArchiveRaw(arch || {});
        knownUpdatedAt.current = meta?.updatedAt || 0;
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [currentStoreId]);

  const monthsMeta = useMemo(() => {
    if (!data) return null;
    const s = data.settings;
    const { year: y2, month: m2 } = nextMonth(s.year, s.startMonth);
    const days1 = buildMonthDays(s.year, s.startMonth, data.holidays, data.issueDays);
    const days2 = buildMonthDays(y2, m2, data.holidays, data.issueDays);
    return [
      { key: "m1", label: `${s.year}년 ${s.startMonth}월`, days: days1 },
      { key: "m2", label: `${y2}년 ${m2}월`, days: days2 },
    ];
  }, [data]);

  const triggerSave = useCallback(() => { saveTick.current += 1; setSaveState("pending"); }, []);
  const [storeMissing, setStoreMissing] = useState(false);
  const knownUpdatedAt = useRef(null); // 이 브라우저가 마지막으로 확인한 "서버 최종수정시각"
  const [externalChange, setExternalChange] = useState(false); // 다른 곳에서 수정된 게 감지됐는지
  const setData = useCallback((updater) => {
    setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
    triggerSave();
  }, [triggerSave]);
  const setSchedule = useCallback((updater) => {
    setScheduleRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
    triggerSave();
  }, [triggerSave]);
  const setArchive = useCallback((updater) => {
    setArchiveRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
    triggerSave();
  }, [triggerSave]);

  const reloadStoreList = async () => {
    setStoreMissing(false);
    try {
      const list = await api.listStores();
      setStoreList(list);
      const stillExists = list.some((s) => s.id === currentStoreId);
      if (!stillExists) setCurrentStoreId(list[0]?.id || null);
    } catch (e) { /* ignore */ }
  };

  // 지금 이 화면 내용을 버리고 서버의 최신 내용을 다시 불러오기 (배너의 "새로고침" 버튼)
  const reloadCurrentStore = () => {
    const id = currentStoreId;
    setCurrentStoreId(null);
    setTimeout(() => setCurrentStoreId(id), 0);
  };

  useEffect(() => {
    if (!currentStoreId || !data || !schedule) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const calls = [
          api.putConfig(currentStoreId, data),
          api.putSchedule(currentStoreId, schedule),
        ];
        if (archive) calls.push(api.putArchive(currentStoreId, archive));
        const results = await Promise.all(calls);
        const latest = Math.max(...results.map((r) => r?.updatedAt || 0));
        if (latest) knownUpdatedAt.current = latest; // 내가 방금 저장한 거니까 "알고 있는 최신"으로 갱신
        setSaveState("saved");
        setStoreMissing(false);
      } catch (e) {
        setSaveState("error");
        if (e.status === 404) setStoreMissing(true);
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schedule, archive, currentStoreId]);

  // 다른 사람이 이 매장을 수정했는지 주기적으로(그리고 화면에 돌아왔을 때) 확인
  useEffect(() => {
    if (!currentStoreId) return;
    const checkForExternalChange = async () => {
      if (knownUpdatedAt.current === null) return; // 아직 초기 로드 전이면 건너뜀
      try {
        const meta = await api.getMeta(currentStoreId);
        if (meta && meta.updatedAt && meta.updatedAt > knownUpdatedAt.current) {
          setExternalChange(true);
        }
      } catch (e) { /* 네트워크 문제 등은 무시 */ }
    };
    const interval = setInterval(checkForExternalChange, 20000); // 20초마다
    const onVisible = () => { if (document.visibilityState === "visible") checkForExternalChange(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentStoreId]);

  useEffect(() => {
    if (!data || !schedule || !monthsMeta) return;
    const need = data.employees.some((e) => !schedule.m1[e.id] || !schedule.m2[e.id] ||
      schedule.m1[e.id].length !== monthsMeta[0].days.length ||
      schedule.m2[e.id].length !== monthsMeta[1].days.length);
    const memoNeed = (data.memoRowLabels || []).some((r) =>
      !schedule.m1Memo?.[r.id] || !schedule.m2Memo?.[r.id] ||
      schedule.m1Memo[r.id].length !== monthsMeta[0].days.length ||
      schedule.m2Memo[r.id].length !== monthsMeta[1].days.length
    );
    if (need || memoNeed) {
      setScheduleRaw((prev) => {
        const empSched = reconcileSchedule(prev, data.employees, monthsMeta[0].days, monthsMeta[1].days);
        const memoSched = reconcileMemoRows(prev, data.memoRowLabels, monthsMeta[0].days, monthsMeta[1].days);
        return { ...empSched, m1Memo: memoSched.m1Memo, m2Memo: memoSched.m2Memo };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.employees, data?.settings?.year, data?.settings?.startMonth, data?.memoRowLabels]);

  const createStore = async () => {
    const name = window.prompt("새 매장 이름을 입력하세요", "새 매장");
    if (!name) return;
    const group = window.prompt("채널/그룹 (예: DS채널, DFS채널, FS/HAUS채널)\n비워두면 '미분류'로 들어갑니다.", "");
    try {
      const created = await api.createStore(name, group || "");
      setStoreList((prev) => [...prev, created]);
      setCurrentStoreId(created.id);
      setStoreMissing(false);
    } catch (e) { alert(e.message); }
  };

  const renameStore = async () => {
    if (!currentStoreId) return;
    const cur = storeList.find((s) => s.id === currentStoreId);
    const name = window.prompt("매장 이름 수정", cur?.name || "");
    if (!name) return;
    const group = window.prompt("채널/그룹 수정 (예: DS채널, DFS채널, FS/HAUS채널)\n비워두면 '미분류'로 들어갑니다.", cur?.group || "");
    try {
      await api.renameStore(currentStoreId, name, group ?? "");
      setStoreList((prev) => prev.map((s) => (s.id === currentStoreId ? { ...s, name, group: group ?? "" } : s)));
      setData((d) => ({ ...d, settings: { ...d.settings, storeName: name } }));
    } catch (e) {
      if (e.status === 404) {
        setStoreMissing(true);
      } else {
        alert(e.message);
      }
    }
  };

  const deleteStore = async () => {
    if (!currentStoreId) return;
    const cur = storeList.find((s) => s.id === currentStoreId);
    const typed = window.prompt(
      `정말 삭제하시겠어요? 되돌리려면 관리자가 "복구 스냅샷"에서 직접 복원해야 합니다.\n확인하려면 매장 이름을 정확히 입력하세요: ${cur?.name || ""}`
    );
    if (typed !== (cur?.name || "")) {
      if (typed !== null) alert("입력한 이름이 일치하지 않아 삭제를 취소했습니다.");
      return;
    }
    try {
      await api.deleteStore(currentStoreId);
      const newList = storeList.filter((s) => s.id !== currentStoreId);
      setStoreList(newList);
      setCurrentStoreId(newList[0]?.id || null);
    } catch (e) { alert(e.message); }
  };

  const [backupBusy, setBackupBusy] = useState(false);
  const restoreFileRef = useRef(null);

  const downloadBackup = async () => {
    setBackupBusy(true);
    try {
      const backup = await api.getBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `매장스케줄_전체백업_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("백업 다운로드에 실패했습니다: " + e.message);
    } finally {
      setBackupBusy(false);
    }
  };

  const pickRestoreFile = () => restoreFileRef.current?.click();

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("백업 파일로 전체 데이터를 덮어씁니다. 지금 있는 모든 매장 데이터가 백업 시점 상태로 바뀝니다.\n(지금 상태는 복원 직전 자동으로 스냅샷 저장되니, 실수해도 \"복구 스냅샷\"에서 되돌릴 수 있습니다.) 계속할까요?")) return;
    setBackupBusy(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await api.restoreBackup(backup);
      const list = await api.listStores();
      setStoreList(list);
      setCurrentStoreId(list[0]?.id || null);
      alert("복원이 완료됐습니다.");
    } catch (e) {
      alert("복원에 실패했습니다: " + e.message);
    } finally {
      setBackupBusy(false);
    }
  };

  /* --- 안전장치: 복구 스냅샷 패널 (백업 복원/매장 삭제 직전 자동 저장된 것들) --- */
  const [snapshotPanel, setSnapshotPanel] = useState(false);
  const [snapshots, setSnapshots] = useState(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const openSnapshotPanel = async () => {
    setSnapshotPanel(true);
    setSnapshots(null);
    try {
      const list = await api.listSnapshots();
      setSnapshots(list);
    } catch (e) {
      alert("스냅샷 목록을 불러오지 못했습니다: " + e.message);
      setSnapshotPanel(false);
    }
  };

  const restoreFromSnapshot = async (snap) => {
    const when = new Date(snap.created_at).toLocaleString("ko-KR");
    if (!window.confirm(`"${when}" 시점(${snap.reason})으로 전체 데이터를 되돌릴까요?\n지금 상태도 복원 직전 자동으로 또 스냅샷 저장되니 안전합니다.`)) return;
    setSnapshotBusy(true);
    try {
      await api.restoreSnapshot(snap.id);
      const list = await api.listStores();
      setStoreList(list);
      setCurrentStoreId(list[0]?.id || null);
      setSnapshotPanel(false);
      alert("복원이 완료됐습니다.");
    } catch (e) {
      alert("복원에 실패했습니다: " + e.message);
    } finally {
      setSnapshotBusy(false);
    }
  };

  if (loading && storeList === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-indigo-300" />
          <span className="font-bold text-sm">매장 스케줄링 자동화</span>
          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-1">
            {role === "admin" ? "총관리자" : role === "manager" ? "매장관리자" : "사용자"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {storeList && storeList.length > 0 && (
            <select
              value={currentStoreId || ""}
              onChange={(e) => setCurrentStoreId(e.target.value)}
              className="bg-slate-800 text-white text-sm rounded-md px-2 py-1.5 border border-slate-700 focus:outline-none max-w-[220px]"
            >
              {groupedStoreOptions(storeList).map(([groupName, list]) => (
                <optgroup key={groupName} label={groupName}>
                  {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          {isAdmin && (
            <button onClick={createStore} className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md">
              <Plus size={13} /> 새 매장
            </button>
          )}
          {currentStoreId && isAdmin && (
            <>
              <button onClick={renameStore} className="text-xs text-slate-300 hover:text-white px-2 py-1.5">이름변경</button>
              <button onClick={deleteStore} className="text-xs text-red-300 hover:text-red-200 px-2 py-1.5">삭제</button>
            </>
          )}
          {isAdmin && (
            <>
              <span className="w-px h-4 bg-slate-700 mx-1" />
              <button
                onClick={downloadBackup} disabled={backupBusy}
                title="전체 매장 데이터를 파일로 내려받습니다 (가끔 오프라인 보관용으로 받아두면 좋습니다)"
                className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 px-2 py-1.5 disabled:opacity-50"
              >
                <Download size={12} /> 전체 백업
              </button>
              <button
                onClick={pickRestoreFile} disabled={backupBusy}
                title="백업 파일로 전체 데이터를 복원합니다"
                className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 px-2 py-1.5 disabled:opacity-50"
              >
                <Upload size={12} /> 백업 복원
              </button>
              <input ref={restoreFileRef} type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
              <button
                onClick={openSnapshotPanel}
                title="백업 복원/매장 삭제 직전 자동 저장된 안전 스냅샷 목록 (실수했을 때 여기서 되돌리세요)"
                className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 px-2 py-1.5"
              >
                <History size={12} /> 복구 스냅샷
              </button>
            </>
          )}
          <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-1">
            <Save size={11} />
            {saveState === "saving" ? "저장 중..." : saveState === "saved" ? "저장됨" : saveState === "error" ? "저장 실패" : "자동저장"}
          </span>
          <button onClick={onLogout} className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1.5">
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>

      {snapshotPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSnapshotPanel(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-1.5"><History size={15} /> 복구 스냅샷</span>
              <button onClick={() => setSnapshotPanel(false)} className="text-slate-400 hover:text-slate-600 text-sm">닫기</button>
            </div>
            <div className="px-4 py-2 text-[11px] text-slate-500 border-b">
              백업 복원이나 매장 삭제 직전에 자동으로 저장된 전체 데이터 스냅샷이에요. 최근 {snapshots?.length ?? 0}개까지 보관됩니다.
              잘못 복원/삭제했다면 여기서 원하는 시점으로 되돌릴 수 있어요.
            </div>
            <div className="flex-1 overflow-y-auto">
              {snapshots === null && (
                <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
              )}
              {snapshots !== null && snapshots.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400">아직 저장된 스냅샷이 없습니다.</div>
              )}
              {snapshots?.map((snap) => (
                <div key={snap.id} className="px-4 py-2.5 border-b last:border-b-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{snap.reason}</div>
                    <div className="text-[11px] text-slate-400">{new Date(snap.created_at).toLocaleString("ko-KR")}</div>
                  </div>
                  <button
                    onClick={() => restoreFromSnapshot(snap)}
                    disabled={snapshotBusy}
                    className="flex-shrink-0 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-2.5 py-1.5 rounded-md"
                  >
                    이 시점으로 복원
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {storeMissing && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-sm px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span>
            <b>이 매장 데이터를 서버에서 찾을 수 없습니다.</b> 매장이 삭제되었거나 주소가 잘못됐을 수 있습니다.
            관리자라면 "복구 스냅샷"에서 삭제 직전 상태를 되살리거나, 최근 백업 파일로 "백업 복원"할 수 있습니다.
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GhostBtn onClick={reloadStoreList}>매장 목록 새로고침</GhostBtn>
            {isAdmin && <GhostBtn onClick={pickRestoreFile} icon={Upload}>백업 복원</GhostBtn>}
          </div>
        </div>
      )}

      {externalChange && !storeMissing && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span>
            <b>다른 곳에서 이 매장 스케줄을 수정했습니다.</b> 지금 화면은 최신이 아닐 수 있어요.
            새로고침하면 최신 내용을 볼 수 있습니다 (지금 화면에서 방금 직접 입력한 내용이 있다면, 새로고침 전에 저장 완료됐는지 "저장됨" 표시를 확인해주세요).
          </span>
          <GhostBtn onClick={reloadCurrentStore} icon={Loader2}>새로고침</GhostBtn>
        </div>
      )}

      {!currentStoreId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Store size={36} className="text-slate-300" />
          <p className="text-sm">아직 매장이 없습니다. {isAdmin ? '"새 매장"을 눌러 시작하세요.' : "관리자에게 매장 생성을 요청하세요."}</p>
          {isAdmin && <PrimaryBtn onClick={createStore} icon={Plus}>새 매장 만들기</PrimaryBtn>}
        </div>
      ) : !data || !schedule || loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <div className="w-52 bg-white border-r border-slate-200 py-4 flex-shrink-0">
            {(role === "viewer" ? VIEWER_TAB_GROUPS : TAB_GROUPS).map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "mt-4 pt-4 border-t border-slate-100" : ""}>
                <div className="px-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</div>
                {group.tabs.map((t) => (
                  <button
                    key={t.key} onClick={() => setTab(t.key)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <t.icon size={15} /> {t.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{data.settings.storeName || "매장"} · {TABS.find((t) => t.key === tab)?.label}</h2>
            {tab === "settings" && <SettingsTab data={data} setData={setData} role={role} />}
            {tab === "employees" && <EmployeesTab data={data} setData={setData} role={role} />}
            {tab === "tags" && <TagsTab data={data} setData={setData} role={role} />}
            {tab === "holidays" && <HolidaysTab data={data} setData={setData} role={role} />}
            {tab === "requests" && <RequestsTab data={data} setData={setData} role={role} />}
            {tab === "templates" && <ShiftTemplatesTab data={data} setData={setData} role={role} />}
            {tab === "m1" && monthsMeta && (
              <ScheduleTab data={data} setData={setData} schedule={schedule} setSchedule={setSchedule} archive={archive} setArchive={setArchive} monthsMeta={monthsMeta} monthKey="m1" role={role} />
            )}
            {tab === "m2" && monthsMeta && (
              <ScheduleTab data={data} setData={setData} schedule={schedule} setSchedule={setSchedule} archive={archive} setArchive={setArchive} monthsMeta={monthsMeta} monthKey="m2" role={role} />
            )}
            {tab === "summary" && monthsMeta && <SummaryTab data={data} schedule={schedule} monthsMeta={monthsMeta} />}
            {tab === "archive" && <ArchiveTab data={data} archive={archive || {}} setArchive={setArchive} role={role} />}
            {tab === "leave" && <LeaveTab data={data} setData={setData} archive={archive || {}} role={role} />}
            {tab === "shifty" && monthsMeta && <ShiftyMapTab data={data} setData={setData} schedule={schedule} archive={archive || {}} monthsMeta={monthsMeta} role={role} currentStoreId={currentStoreId} storeList={storeList} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(null); // null=확인중, false=미인증, role문자열=인증됨

  useEffect(() => {
    const pw = getPassword();
    const role = getRole();
    if (pw && role) {
      api.login(pw).then((res) => { setRole(res.role); setAuthed(res.role); }).catch(() => { clearPassword(); setAuthed(false); });
    } else {
      setAuthed(false);
    }
  }, []);

  const handleLogout = () => { clearPassword(); setAuthed(false); };

  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-white" size={24} /></div>;
  }
  if (!authed) {
    return <LoginScreen onLoggedIn={(role) => setAuthed(role)} />;
  }
  return <MainApp role={authed} onLogout={handleLogout} />;
}
