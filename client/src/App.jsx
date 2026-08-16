import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Settings, Users, Tag, CalendarDays, ClipboardList, CheckCircle2,
  PlayCircle, Plus, Trash2, Store, Loader2, AlertTriangle,
  Sparkles, Save, ClipboardCheck, LogOut, Lock, Download, Upload,
} from "lucide-react";
import { api, getPassword, setPassword, clearPassword, getRole, setRole } from "./api";
import {
  WEEKDAYS, DOW_OPTIONS,
  defaultStoreData,
  buildMonthDays, applyPersonalTags, assignRestDays, assignShiftCodes,
  validateMonth, validateCombined, satTarget, sunHolTarget, requiredFT, requiredPT,
  isOffTag, dowBucket, nextMonth, emptySchedule, reconcileSchedule, isActiveEmployee,
} from "./logic";

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

function Select({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className={`border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
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
function SettingsTab({ data, setData }) {
  const s = data.settings;
  const update = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const updateDow = (wd, val) => setData((d) => ({ ...d, settings: { ...d.settings, dow: { ...d.settings.dow, [wd]: val } } }));

  return (
    <div className="max-w-4xl">
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
      </SectionCard>

      <SectionCard title="연속근무 기준" icon={AlertTriangle}>
        <div className="grid grid-cols-4 gap-4">
          <Field label="권장 상한(일)"><NumberInput value={s.consecRecommended} onChange={(v) => update({ consecRecommended: v })} /></Field>
          <Field label="최대 허용(일)"><NumberInput value={s.consecMax} onChange={(v) => update({ consecMax: v })} /></Field>
        </div>
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
    </div>
  );
}

/* ============================================================
   직원목록 탭
   ============================================================ */
function EmployeesTab({ data, setData }) {
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
      <SectionCard title="정직원" icon={Users} right={<GhostBtn onClick={addFT} icon={Plus}>정직원 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          소속을 "지원근무"나 "스위칭근무"로 두면 휴무/휴일·근무 자동배정에서 제외되고, 스케줄 화면에서 수기로만 입력됩니다.
          "자동배정 포함"을 켜면 예외적으로 우리매장 인원처럼 자동배정 대상에 포함시킬 수 있습니다.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 font-semibold">이름</th>
              <th className="py-2 font-semibold">소속</th>
              <th className="py-2 font-semibold">자동배정 포함</th>
              <th className="py-2 font-semibold">재직상태</th>
              <th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {ftList.map((e) => {
              const memberType = e.memberType || "우리매장";
              const isGuest = memberType !== "우리매장";
              return (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2"><TextInput value={e.name} onChange={(v) => update(e.id, { name: v })} className="w-40" /></td>
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
                  <td className="py-1.5 pr-2"><Select value={e.status} onChange={(v) => update(e.id, { status: v })} options={["재직", "퇴직예정", "퇴직"]} /></td>
                  <td><IconBtn onClick={() => remove(e.id)} title="삭제" danger /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    </div>
  );
}

/* ============================================================
   태그목록 탭
   ============================================================ */
function TagsTab({ data, setData }) {
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
                  draggable
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
                <td className="py-1.5 pr-2"><TextInput value={t.desc} onChange={(v) => update(t.id, { desc: v })} className="w-56" /></td>
                <td><IconBtn onClick={() => remove(t.id)} title="삭제" danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ============================================================
   공휴일 · 이슈일 · 개인지정태그 탭
   ============================================================ */
function HolidaysTab({ data, setData }) {
  const { holidays, issueDays, personalTags, employees, tags } = data;

  const updHol = (i, patch) => setData((d) => { const arr = [...d.holidays]; arr[i] = { ...arr[i], ...patch }; return { ...d, holidays: arr }; });
  const rmHol = (i) => setData((d) => ({ ...d, holidays: d.holidays.filter((_, idx) => idx !== i) }));
  const addHol = () => setData((d) => ({ ...d, holidays: [...d.holidays, { date: "", name: "" }] }));

  const updIss = (i, patch) => setData((d) => { const arr = [...d.issueDays]; arr[i] = { ...arr[i], ...patch }; return { ...d, issueDays: arr }; });
  const rmIss = (i) => setData((d) => ({ ...d, issueDays: d.issueDays.filter((_, idx) => idx !== i) }));
  const addIss = () => setData((d) => ({ ...d, issueDays: [...d.issueDays, { start: "", end: "", name: "", ftOverride: "", ptOverride: "" }] }));

  const updPt = (i, patch) => setData((d) => { const arr = [...d.personalTags]; arr[i] = { ...arr[i], ...patch }; return { ...d, personalTags: arr }; });
  const rmPt = (i) => setData((d) => ({ ...d, personalTags: d.personalTags.filter((_, idx) => idx !== i) }));
  const addPt = () => setData((d) => ({ ...d, personalTags: [...d.personalTags, { start: "", end: "", empName: employees[0]?.name || "", tagCode: tags[0]?.code || "" }] }));

  return (
    <div className="max-w-5xl">
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

      <SectionCard title="개인 지정 태그" icon={Tag} right={<GhostBtn onClick={addPt} icon={Plus}>태그 추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">대상 직원의 해당 기간 스케줄 칸에 자동배정 시 태그가 채워집니다 (기존 값은 덮어쓰지 않음).</p>
        <div className="grid grid-cols-1 gap-1.5">
          {personalTags.map((pt, i) => (
            <div key={i} className="flex items-center gap-2">
              <DateInput value={pt.start} onChange={(v) => updPt(i, { start: v })} />
              <span className="text-slate-400 text-xs">~</span>
              <DateInput value={pt.end} onChange={(v) => updPt(i, { end: v })} />
              <Select value={pt.empName} onChange={(v) => updPt(i, { empName: v })} options={employees.map((e) => e.name)} className="w-28" />
              <Select value={pt.tagCode} onChange={(v) => updPt(i, { tagCode: v })} options={tags.map((t) => t.code)} className="w-28" />
              <IconBtn onClick={() => rmPt(i)} title="삭제" danger />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ============================================================
   근무형태템플릿 탭
   ============================================================ */
function ShiftTemplatesTab({ data, setData }) {
  const { ftTemplates, ptTemplates, prefCode } = data;
  const thresholds = data.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };

  const updFt = (i, patch) => setData((d) => { const a = [...d.ftTemplates]; a[i] = { ...a[i], ...patch }; return { ...d, ftTemplates: a }; });
  const rmFt = (i) => setData((d) => ({ ...d, ftTemplates: d.ftTemplates.filter((_, idx) => idx !== i) }));
  const addFt = () => setData((d) => ({ ...d, ftTemplates: [...d.ftTemplates, { code: "", start: "", end: "", wd2: "", wd3: "", wd4: "", we2: "", we3: "", we4: "" }] }));

  const updThreshold = (group, idx, val) => setData((d) => {
    const cur = d.ftThresholds || { weekday: [2, 3, 4], weekend: [2, 3, 4] };
    const arr = [...cur[group]];
    arr[idx] = val;
    return { ...d, ftThresholds: { ...cur, [group]: arr } };
  });

  const updPt = (i, patch) => setData((d) => { const a = [...d.ptTemplates]; a[i] = { ...a[i], ...patch }; return { ...d, ptTemplates: a }; });
  const rmPt = (i) => setData((d) => ({ ...d, ptTemplates: d.ptTemplates.filter((_, idx) => idx !== i) }));
  const addPt = () => setData((d) => ({ ...d, ptTemplates: [...d.ptTemplates, { code: "", start: "", end: "" }] }));

  return (
    <div className="max-w-6xl">
      <SectionCard title="정직원 근무형태" icon={ClipboardCheck} right={<GhostBtn onClick={addFt} icon={Plus}>추가</GhostBtn>}>
        <p className="text-xs text-slate-500 mb-3">
          "평일 몇 인" 기준 자체가 매장마다 다를 수 있어 아래 열 제목의 숫자를 직접 바꿀 수 있습니다 (예: 2/3/4인 → 3/4/5인).
          출근인원이 이 셋 중 가장 가까운 기준에 맞춰 자동으로 그 열의 인원수를 사용합니다.
        </p>
        <table className="text-sm border-collapse" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2" style={{ width: 90 }}>코드</th>
              <th style={{ width: 90 }}>시작</th>
              <th style={{ width: 90 }}>종료</th>
              {[0, 1, 2].map((idx) => (
                <th key={"wd" + idx} className="text-center align-bottom pb-2" style={{ width: 78 }}>
                  <div className="text-[10px] text-slate-400 mb-1">평일</div>
                  <div className="flex items-center justify-center gap-1">
                    <NumberInput value={thresholds.weekday[idx]} onChange={(v) => updThreshold("weekday", idx, v)} className="w-11 px-1 text-center" />
                    <span className="text-[11px] text-slate-400">인</span>
                  </div>
                </th>
              ))}
              {[0, 1, 2].map((idx) => (
                <th key={"we" + idx} className="text-center align-bottom pb-2" style={{ width: 78 }}>
                  <div className="text-[10px] text-slate-400 mb-1">주말</div>
                  <div className="flex items-center justify-center gap-1">
                    <NumberInput value={thresholds.weekend[idx]} onChange={(v) => updThreshold("weekend", idx, v)} className="w-11 px-1 text-center" />
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
                <td className="text-center"><NumberInput value={t.wd2} onChange={(v) => updFt(i, { wd2: v })} className="w-14 text-center" /></td>
                <td className="text-center"><NumberInput value={t.wd3} onChange={(v) => updFt(i, { wd3: v })} className="w-14 text-center" /></td>
                <td className="text-center"><NumberInput value={t.wd4} onChange={(v) => updFt(i, { wd4: v })} className="w-14 text-center" /></td>
                <td className="text-center"><NumberInput value={t.we2} onChange={(v) => updFt(i, { we2: v })} className="w-14 text-center" /></td>
                <td className="text-center"><NumberInput value={t.we3} onChange={(v) => updFt(i, { we3: v })} className="w-14 text-center" /></td>
                <td className="text-center"><NumberInput value={t.we4} onChange={(v) => updFt(i, { we4: v })} className="w-14 text-center" /></td>
                <td className="text-center"><IconBtn onClick={() => rmFt(i)} danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
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

function ScheduleGrid({ data, schedule, setSchedule, monthKey, days }) {
  const { employees, tags, settings } = data;
  const allCodes = useMemo(() => {
    const set = new Set(["", ...tags.map((t) => t.code)]);
    data.ftTemplates.forEach((t) => t.code && set.add(t.code));
    data.ptTemplates.forEach((t) => t.code && set.add(t.code));
    return Array.from(set);
  }, [tags, data.ftTemplates, data.ptTemplates]);

  const active = employees.filter((e) => isActiveEmployee(e));
  const ftList = active.filter((e) => e.type === "정직원");
  const ptList = active.filter((e) => e.type === "파트타이머");

  const satT = satTarget(days);
  const sunHolT = sunHolTarget(days);

  const dayStats = days.map((day) => {
    let ftAttend = 0, ptAttend = 0;
    active.forEach((e) => {
      const v = schedule[monthKey][e.id]?.[day.day - 1] || "";
      const attend = v !== "" && !isOffTag(tags, v);
      if (e.type === "정직원" && attend) ftAttend++;
      if (e.type === "파트타이머" && attend) ptAttend++;
    });
    return { ftReq: requiredFT(settings, day), ptReq: requiredPT(settings, day), ftAttend, ptAttend };
  });

  const setCell = (empId, dayIdx, value) => {
    setSchedule((prev) => {
      const next = { ...prev, [monthKey]: { ...prev[monthKey] } };
      const arr = [...(next[monthKey][empId] || [])];
      arr[dayIdx] = value;
      next[monthKey][empId] = arr;
      return next;
    });
  };

  const cellW = 54;
  const nameW = 132;

  const headerCellStyle = (day) => {
    let bg = "#fff", color = "#334155";
    if (day.holidayName) { color = "#dc2626"; }
    else if (day.issueName) { color = "#059669"; }
    else if (day.weekday === "토") { color = "#2563eb"; }
    if (day.weekday === "토" || day.weekday === "일" || day.holidayName) bg = "#fef2f2";
    return { background: bg, color, minWidth: cellW, maxWidth: cellW };
  };

  return (
    <div>
      <div className="flex items-center gap-6 mb-3 text-sm">
        <div><span className="text-slate-500">적용 연도월:</span> <b>{days.length ? `${days[0].dateStr.slice(0, 7)}` : "-"}</b></div>
        <div><span className="text-slate-500">이번달 휴무목표(토요일수):</span> <b className="text-indigo-600">{satT}</b></div>
        <div><span className="text-slate-500">이번달 휴일목표(일요일+공휴일수):</span> <b className="text-indigo-600">{sunHolT}</b></div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="text-xs border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ minWidth: nameW, maxWidth: nameW }} className="sticky left-0 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left z-10">이름</th>
              {days.map((day) => (
                <th key={day.day} style={headerCellStyle(day)} className="border border-slate-200 px-1 py-1.5 font-semibold">
                  {day.day}<br /><span className="font-normal">{day.weekday}</span>
                </th>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] text-slate-400 z-10">공휴일/이슈</td>
              {days.map((day) => (
                <td key={day.day} className="border border-slate-200 px-1 py-1 text-[9px] text-center text-slate-500 whitespace-nowrap overflow-hidden">
                  {day.holidayName || day.issueName || ""}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] text-slate-400 z-10">적정(FT/PT)</td>
              {days.map((day, i) => (
                <td key={day.day} className="border border-slate-200 px-1 py-1 text-[10px] text-center text-slate-500">
                  {dayStats[i].ftReq}/{dayStats[i].ptReq}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={days.length + 1} className="bg-indigo-50 text-indigo-700 font-bold text-[11px] px-2 py-1 sticky left-0">정직원</td></tr>
            {ftList.map((e) => (
              <tr key={e.id}>
                <td className="sticky left-0 bg-white border border-slate-200 px-2 py-1 font-medium z-10">{e.name}</td>
                {days.map((day, i) => (
                  <td key={day.day} className="border border-slate-200 p-0">
                    <select
                      value={schedule[monthKey][e.id]?.[i] || ""}
                      onChange={(ev) => setCell(e.id, i, ev.target.value)}
                      className="w-full h-full text-[10px] text-center border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 py-1.5"
                    >
                      {allCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr><td colSpan={days.length + 1} className="bg-amber-50 text-amber-700 font-bold text-[11px] px-2 py-1 sticky left-0">파트타이머</td></tr>
            {ptList.map((e) => (
              <tr key={e.id}>
                <td className="sticky left-0 bg-white border border-slate-200 px-2 py-1 font-medium z-10">{e.name}</td>
                {days.map((day, i) => (
                  <td key={day.day} className="border border-slate-200 p-0">
                    <select
                      value={schedule[monthKey][e.id]?.[i] || ""}
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
          <tfoot>
            <tr>
              <td className="sticky left-0 bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold z-10">출근(FT/PT)</td>
              {days.map((day, i) => (
                <td key={day.day} className="border border-slate-200 px-1 py-1 text-[10px] text-center">
                  {dayStats[i].ftAttend}/{dayStats[i].ptAttend}
                </td>
              ))}
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
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ScheduleTab({ data, schedule, setSchedule, monthsMeta, monthKey }) {
  const meta = monthsMeta.find((m) => m.key === monthKey);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState(null);

  const runRestDays = () => {
    setRunning(true);
    setTimeout(() => {
      const { schedule: withPersonal, applied } = applyPersonalTags(schedule, data.employees, data.personalTags, monthsMeta);
      const { schedule: result, message } = assignRestDays(withPersonal, data.employees, data.tags, data.settings, monthsMeta);
      setSchedule(result);
      setMsg(`개인 지정 태그로 채운 칸: ${applied}건 · ${message}`);
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

  const clearAll = () => {
    if (!window.confirm(`${meta.label} 스케줄을 전부 지울까요?`)) return;
    setSchedule((prev) => {
      const next = { ...prev, [monthKey]: {} };
      data.employees.forEach((e) => { next[monthKey][e.id] = Array(meta.days.length).fill(""); });
      return next;
    });
    setMsg(null);
  };

  const val = useMemo(() => validateMonth(schedule, data.employees, data.tags, data.settings, meta.days, monthKey), [schedule, data, meta, monthKey]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <PrimaryBtn onClick={runRestDays} disabled={running} icon={PlayCircle}>1단계: 휴무/휴일 자동배정</PrimaryBtn>
        <PrimaryBtn onClick={runShiftCodes} disabled={running} icon={Sparkles}>2단계: 근무 자동배정</PrimaryBtn>
        <GhostBtn onClick={clearAll} icon={Trash2}>이 달 전체 지우기</GhostBtn>
        {running && <Loader2 className="animate-spin text-indigo-500" size={18} />}
      </div>
      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-md px-3 py-2 mb-3 whitespace-pre-wrap">{msg}</div>
      )}
      <div className="flex gap-4 mb-3 text-xs">
        <span className={`px-2 py-1 rounded-md font-semibold ${val.notOkCount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          최소인원 미달: {val.notOkCount}건
        </span>
        <span className={`px-2 py-1 rounded-md font-semibold ${val.warnList.length > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          연속근무 상한 초과: {val.warnList.length === 0 ? "없음" : val.warnList.join(", ")}
        </span>
      </div>
      <ScheduleGrid data={data} schedule={schedule} setSchedule={setSchedule} monthKey={monthKey} days={meta.days} />
    </div>
  );
}

/* ============================================================
   2개월 요약 탭
   ============================================================ */
function SummaryTab({ data, schedule, monthsMeta }) {
  const active = data.employees.filter((e) => isActiveEmployee(e));
  const target =
    satTarget(monthsMeta[0].days) + sunHolTarget(monthsMeta[0].days) +
    satTarget(monthsMeta[1].days) + sunHolTarget(monthsMeta[1].days);

  const combinedWarn = validateCombined(schedule, data.employees, data.tags, data.settings, monthsMeta);

  const rows = active.map((e) => {
    const counts = { m1: { humu: 0, hyuil: 0 }, m2: { humu: 0, hyuil: 0 } };
    monthsMeta.forEach(({ key }) => {
      (schedule[key][e.id] || []).forEach((v) => {
        if (v === "휴무") counts[key].humu++;
        if (v === "휴일") counts[key].hyuil++;
      });
    });
    const total = counts.m1.humu + counts.m1.hyuil + counts.m2.humu + counts.m2.hyuil;
    return { ...e, counts, total, diff: total - target };
  });

  return (
    <div className="max-w-4xl">
      <SectionCard title="2개월 목표" icon={CheckCircle2}>
        <div className="text-sm">
          2개월 목표 합계 (인당 배정일수): <b className="text-indigo-600 text-lg">{target}일</b>
        </div>
      </SectionCard>
      <SectionCard title="인당 휴무/휴일 현황" icon={ClipboardList}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2">이름</th><th>구분</th>
              <th>1개월 휴무</th><th>1개월 휴일</th><th>2개월 휴무</th><th>2개월 휴일</th>
              <th>총합계</th><th>목표대비</th><th>검증</th>
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
                <td className="text-center font-bold">{r.total}</td>
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
   메인 앱
   ============================================================ */
const TABS = [
  { key: "settings", label: "설정", icon: Settings },
  { key: "employees", label: "직원목록", icon: Users },
  { key: "tags", label: "태그목록", icon: Tag },
  { key: "holidays", label: "공휴일·이슈일", icon: CalendarDays },
  { key: "templates", label: "근무형태템플릿", icon: ClipboardCheck },
  { key: "m1", label: "스케줄 1개월차", icon: ClipboardList },
  { key: "m2", label: "스케줄 2개월차", icon: ClipboardList },
  { key: "summary", label: "2개월요약", icon: CheckCircle2 },
];

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
  const [tab, setTab] = useState("settings");
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
    if (!currentStoreId) { setDataRaw(null); setScheduleRaw(null); return; }
    (async () => {
      setLoading(true);
      try {
        const [cfg, sched] = await Promise.all([
          api.getConfig(currentStoreId),
          api.getSchedule(currentStoreId),
        ]);
        const finalData = cfg || defaultStoreData();
        setDataRaw(finalData);
        const s1 = finalData.settings;
        const { year: y2, month: m2 } = nextMonth(s1.year, s1.startMonth);
        const days1 = buildMonthDays(s1.year, s1.startMonth, finalData.holidays, finalData.issueDays);
        const days2 = buildMonthDays(y2, m2, finalData.holidays, finalData.issueDays);
        setScheduleRaw(reconcileSchedule(sched, finalData.employees, days1, days2));
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
  const setData = useCallback((updater) => {
    setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
    triggerSave();
  }, [triggerSave]);
  const setSchedule = useCallback((updater) => {
    setScheduleRaw((prev) => (typeof updater === "function" ? updater(prev) : updater));
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

  useEffect(() => {
    if (!currentStoreId || !data || !schedule) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await Promise.all([
          api.putConfig(currentStoreId, data),
          api.putSchedule(currentStoreId, schedule),
        ]);
        setSaveState("saved");
        setStoreMissing(false);
      } catch (e) {
        setSaveState("error");
        if (e.status === 404) setStoreMissing(true);
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schedule, currentStoreId]);

  useEffect(() => {
    if (!data || !schedule || !monthsMeta) return;
    const need = data.employees.some((e) => !schedule.m1[e.id] || !schedule.m2[e.id] ||
      schedule.m1[e.id].length !== monthsMeta[0].days.length ||
      schedule.m2[e.id].length !== monthsMeta[1].days.length);
    if (need) {
      setScheduleRaw((prev) => reconcileSchedule(prev, data.employees, monthsMeta[0].days, monthsMeta[1].days));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.employees, data?.settings?.year, data?.settings?.startMonth]);

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
    if (!window.confirm("이 매장 데이터를 삭제할까요? 되돌릴 수 없습니다.")) return;
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
    if (!window.confirm("백업 파일로 전체 데이터를 덮어씁니다. 지금 있는 모든 매장 데이터가 백업 시점 상태로 바뀝니다. 계속할까요?")) return;
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
          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-1">{isAdmin ? "관리자" : "직원"}</span>
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
                title="전체 매장 데이터를 파일로 내려받습니다 (재배포 전에 꼭 눌러두세요)"
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

      {storeMissing && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-sm px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span>
            <b>이 매장 데이터를 서버에서 찾을 수 없습니다.</b> 서버가 재시작되며 데이터가 초기화되었을 수 있습니다.
            최근에 받아둔 백업 파일이 있다면 "백업 복원"으로 되살릴 수 있습니다.
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GhostBtn onClick={reloadStoreList}>매장 목록 새로고침</GhostBtn>
            {isAdmin && <GhostBtn onClick={pickRestoreFile} icon={Upload}>백업 복원</GhostBtn>}
          </div>
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
            {TABS.map((t) => (
              <button
                key={t.key} onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{data.settings.storeName || "매장"} · {TABS.find((t) => t.key === tab)?.label}</h2>
            {tab === "settings" && <SettingsTab data={data} setData={setData} />}
            {tab === "employees" && <EmployeesTab data={data} setData={setData} />}
            {tab === "tags" && <TagsTab data={data} setData={setData} />}
            {tab === "holidays" && <HolidaysTab data={data} setData={setData} />}
            {tab === "templates" && <ShiftTemplatesTab data={data} setData={setData} />}
            {tab === "m1" && monthsMeta && (
              <ScheduleTab data={data} schedule={schedule} setSchedule={setSchedule} monthsMeta={monthsMeta} monthKey="m1" />
            )}
            {tab === "m2" && monthsMeta && (
              <ScheduleTab data={data} schedule={schedule} setSchedule={setSchedule} monthsMeta={monthsMeta} monthKey="m2" />
            )}
            {tab === "summary" && monthsMeta && <SummaryTab data={data} schedule={schedule} monthsMeta={monthsMeta} />}
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
