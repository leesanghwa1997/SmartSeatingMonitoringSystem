import { useSeatStatus } from "../hooks/useSeatStatus";
import { useMemo } from "react";

/**
 * 경고 단계별 UI 매핑
 */
function levelUI(level) {
  if (level === "danger") {
    return {
      bg: "from-rose-100 via-red-50 to-white",
      badge: "bg-red-600",
      ring: "ring-red-200/60",
      title: "경고",
      desc: "장시간 상태가 감지되었습니다. 휴식을 권장합니다.",
    };
  }

  if (level === "warn") {
    return {
      bg: "from-amber-100 via-orange-50 to-white",
      badge: "bg-orange-600",
      ring: "ring-orange-200/60",
      title: "주의",
      desc: "지속 시간이 증가하고 있습니다. 자세를 점검하세요.",
    };
  }

  return {
    bg: "from-emerald-100 via-green-50 to-white",
    badge: "bg-emerald-600",
    ring: "ring-emerald-200/60",
    title: "정상",
    desc: "현재 상태가 정상입니다.",
  };
}

/**
 * ISO 시간 → 사람이 읽기 좋은 한국 시간
 */
function formatKoreanTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function DashboardPage() {
  /** ✅ 항상 최상단에서 Hook 실행 */
  const data = useSeatStatus();

  /** ✅ Hook 순서 고정 */
  const ui = useMemo(
    () => (data ? levelUI(data.level) : null),
    [data?.level]
  );

  /** ✅ 조건부 return은 Hook 이후 */
  if (!data || !ui) {
    return <div className="p-6 text-slate-500">로딩 중...</div>;
  }

  const { isSeated, seatedMinutes, detectedAt } = data;

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${ui.bg} p-6 shadow-lg ring-1 ${ui.ring}`}
    >
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">대시보드</h2>
          <p className="mt-1 text-sm text-slate-600">
            실시간 착석 상태와 경고 단계를 표시합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`${ui.badge} rounded-full px-3 py-1 text-sm font-bold text-white shadow`}
          >
            {ui.title}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-white/70">
            업데이트: {formatKoreanTime(detectedAt)}
          </span>
        </div>
      </div>

      {/* 카드 영역 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* 착석 상태 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">
            착석 상태
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-3xl font-black tracking-tight">
              {isSeated ? "착석" : "미착석"}
            </div>
            <div className="text-2xl">{isSeated ? "✅" : "⛔️"}</div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            상태 변화는 센서 이벤트에 따라 반영됩니다.
          </p>
        </div>

        {/* 착석 시간 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">
            현재 착석 시간
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight">
            {seatedMinutes}{" "}
            <span className="text-base font-bold text-slate-600">min</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            기준 시간을 초과하면 주의/경고 단계가 올라갑니다.
          </p>
        </div>

        {/* 경고 안내 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">
            경고 안내
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight">
            {ui.desc}
          </div>
          <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700 ring-1 ring-white/70">
            배경색은 단계(정상/주의/경고)에 따라 변경됩니다.
          </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Tip: 기록 페이지에서 10분 단위 착석 패턴을 확인하세요.
        </div>
        <div className="text-xs text-slate-500">
          (추후) Socket.IO 연결 시 실시간 반영
        </div>
      </div>
    </div>
  );
}
