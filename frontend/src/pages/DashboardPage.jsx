import { useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "../app/notifications";

/* ===============================
   단계별 UI
=============================== */
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
  const { add, enabled } = useNotifications();

  /* ===============================
     상태 (서버 단일 진실)
  =============================== */
  const [state, setState] = useState({
    isSeated: false,
    seatedMinutes: 0,
    detectedAt: null,
    level: "normal",
  });

  /* 🔐 danger 중복 알림 방지 */
  const prevLevelRef = useRef("normal");

  /* ===============================
     ✅ API Polling (5초)
  =============================== */
  useEffect(() => {
    let mounted = true;

    const fetchState = async () => {
      try {
        const res = await fetch("/api/state/current");
        const data = await res.json();

        if (mounted) {
          setState(data);
        }
      } catch {
        // 서버 일시적 문제 → 무시 (UI 유지)
      }
    };

    fetchState(); // 최초 1회
    const id = setInterval(fetchState, 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  /* ===============================
     🔔 danger 진입 시 알림 (1회)
  =============================== */
  useEffect(() => {
    const prev = prevLevelRef.current;
    const curr = state.level;

    // normal이 아니면서, 이전 상태와 다를 때 (등급 상향 or 변경) 경고
    // 또는 같은 'warn'/'danger'라도 메시지가 바뀔 수 있으므로... (일단은 레벨 변경 시에만)
    // 조건: "danger" 진입 시 OR "warn" 진입 시.
    // 기존: if (prev !== "danger" && curr === "danger")
    // 변경: warn 또는 danger 진입 시
    if ((curr === "danger" || curr === "warn") && prev !== curr) {
      const isDanger = curr === "danger";

      const title = isDanger ? "위험 경고" : "자세 주의";
      const body = state.posture || (isDanger ? "장시간 상태가 감지되었습니다." : "자세를 점검하세요.");

      add({
        type: isDanger ? "danger" : "warning", // assuming 'warning' type exists in notifications.jsx? no, let's check.
        title: title,
        message: body,
      });

      if (enabled && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, {
            body: body,
          });
        }
      }
    }

    prevLevelRef.current = curr;
  }, [state.level, state.posture, add, enabled]);

  const ui = useMemo(() => levelUI(state.level), [state.level]);

  /* ===============================
     렌더링
  =============================== */
  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${ui.bg} p-6 shadow-lg ring-1 ${ui.ring}`}
    >
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">대시보드</h2>
          <p className="text-sm text-slate-600">
            실시간 착석 상태와 경고 단계를 표시합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`${ui.badge} rounded-full px-3 py-1 text-sm font-bold text-white`}
          >
            {ui.title}
          </span>

          <span className="rounded-full bg-white/70 px-3 py-1 text-xs">
            업데이트: {formatKoreanTime(state.detectedAt)}
          </span>
          <button
            onClick={async () => {
              if (!confirm("착석 기록을 초기화할까요?")) return;

              await fetch("/api/state/reset", {
                method: "POST",
              });

              // 즉시 UI 반영
              setState({
                isSeated: false,
                seatedMinutes: 0,
                detectedAt: null,
                level: "normal",
                posture: "초기화됨"
              });
            }}
            className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 카드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 착석 상태 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">착석 상태</div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-3xl font-black">
              {state.isSeated ? "착석" : "미착석"}
            </div>
            <div className="text-2xl">
              {state.isSeated ? "✅" : "⛔️"}
            </div>
          </div>
        </div>

        {/* 착석 시간 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">현재 착석 시간</div>
          <div className="mt-2 text-3xl font-black">
            {state.seatedMinutes} <span className="text-base">min</span>
          </div>
        </div>

        {/* 현재 자세 (New) */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">현재 자세 판별</div>
          <div className="mt-2 text-xl font-extrabold text-slate-800 break-keep">
            {state.posture || "분석 중..."}
          </div>
        </div>

        {/* 경고 안내 */}
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">경고 안내</div>
          <div className="mt-2 font-bold text-sm text-slate-700 break-keep">
            {/* 상태가 정상이 아니면 자세 내용을 한 번 더 강조하거나 ui.desc 사용 */}
            {state.level === 'normal' ? ui.desc : (state.posture || ui.desc)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 text-right">
        Tip: 상태는 센서 값(0~1023)을 분석하여 5초 주기로 갱신됩니다.
      </div>
    </div>
  );
}
