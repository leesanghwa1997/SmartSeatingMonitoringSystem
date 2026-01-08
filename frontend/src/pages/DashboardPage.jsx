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

function formatKoreanTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function DashboardPage() {
  const data = useSeatStatus();

  /** ✅ data 없으면 여기서 컷 */
  if (!data) {
    return <div className="p-6 text-slate-500">로딩 중...</div>;
  }

  const { isSeated, seatedMinutes, detectedAt, level, __test } = data;

  const ui = useMemo(() => levelUI(level), [level]);

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${ui.bg} p-6 shadow-lg ring-1 ${ui.ring}`}>
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">대시보드</h2>
          <p className="text-sm text-slate-600">
            실시간 착석 상태와 경고 단계를 표시합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`${ui.badge} rounded-full px-3 py-1 text-sm font-bold text-white`}>
            {ui.title}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs">
            업데이트: {formatKoreanTime(detectedAt)}
          </span>
        </div>
      </div>

      {/* 카드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* 착석 상태 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">착석 상태</div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-3xl font-black">
              {isSeated ? "착석" : "미착석"}
            </div>
            <div className="text-2xl">{isSeated ? "✅" : "⛔️"}</div>
          </div>

          {/* 🧪 테스트 버튼 */}
          {__test && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={__test.startSeated}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs"
              >
                착석 시작
              </button>
              <button
                onClick={__test.stopSeated}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs"
              >
                미착석
              </button>
            </div>
          )}
        </div>

        {/* 착석 시간 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">현재 착석 시간</div>
          <div className="mt-2 text-3xl font-black">
            {seatedMinutes} <span className="text-base">min</span>
          </div>

          {__test && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => __test.addMinutes(10)}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs"
              >
                +10분
              </button>
              <button
                onClick={() => __test.subMinutes(10)}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs"
              >
                -10분
              </button>
            </div>
          )}
        </div>

        {/* 경고 안내 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">경고 안내</div>
          <div className="mt-2 font-extrabold">{ui.desc}</div>
        </div>
      </div>
    </div>
  );
}
