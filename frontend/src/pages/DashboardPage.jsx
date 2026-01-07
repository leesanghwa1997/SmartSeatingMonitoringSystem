import { useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "../app/notifications";

function levelUI(level) {
  // normal | warn | danger
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

function calcLevel(seatedMinutes) {
  // 너희 팀 기준값으로 바꿔도 됨
  if (seatedMinutes >= 60) return "danger";
  if (seatedMinutes >= 30) return "warn";
  return "normal";
}

export default function DashboardPage() {
  const { add } = useNotifications();

  // ✅ 나중에 socket에서 값 들어오면 setSeatState로 그대로 교체하면 됨
  const [seatState, setSeatState] = useState(() => {
    const seatedMinutes = 42;
    return {
      isSeated: true,
      seatedMinutes,
      level: calcLevel(seatedMinutes),
      lastUpdate: new Date().toLocaleTimeString(),
    };
  });

  // 알림 중복 방지용 이전값 기억
  const prev = useRef({
    level: seatState.level,
    isSeated: seatState.isSeated,
  });

  // (옵션) 브라우저 알림 권한 상태
  const [notiPerm, setNotiPerm] = useState(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission; // default | granted | denied
  });

  const ui = useMemo(() => levelUI(seatState.level), [seatState.level]);

  // ✅ level / 착석상태 변경될 때 알림 생성
  useEffect(() => {
    const prevLevel = prev.current.level;
    const prevSeated = prev.current.isSeated;

    // 최초 1회는 알림 안 띄우고 기준만 잡기
    if (prevLevel === undefined && prevSeated === undefined) {
      prev.current = { level: seatState.level, isSeated: seatState.isSeated };
      return;
    }

    // 1) 경고 단계 변경 알림
    if (prevLevel !== seatState.level) {
      add({
        type: seatState.level,
        title: "경고 단계 변경",
        message: `${prevLevel} → ${seatState.level}`,
      });

      // (옵션) 브라우저 알림은 warn/danger일 때만
      if (notiPerm === "granted" && (seatState.level === "warn" || seatState.level === "danger")) {
        new Notification(`착석 ${ui.title}`, {
          body: ui.desc,
        });
      }
    }

    // 2) 착석/미착석 변경 알림 (원하면 유지, 싫으면 삭제)
    if (prevSeated !== seatState.isSeated) {
      add({
        type: "normal",
        title: "착석 상태 변경",
        message: seatState.isSeated ? "착석 시작" : "미착석(자리 비움)",
      });
    }

    // 업데이트
    prev.current = { level: seatState.level, isSeated: seatState.isSeated };
  }, [seatState.level, seatState.isSeated, add, notiPerm, ui.title, ui.desc]);

  // ✅ 데모용: 5초마다 seatedMinutes 변화시키는 시뮬레이터
  // 실제 소켓 붙이면 이 useEffect 통째로 삭제하면 됨
  useEffect(() => {
    const timer = setInterval(() => {
      setSeatState((s) => {
        // 착석 중이면 +1분씩 올라가는 느낌
        const nextMinutes = s.isSeated ? s.seatedMinutes + 1 : 0;
        const nextLevel = calcLevel(nextMinutes);
        return {
          ...s,
          seatedMinutes: nextMinutes,
          level: nextLevel,
          lastUpdate: new Date().toLocaleTimeString(),
        };
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  async function requestBrowserNoti() {
    if (typeof Notification === "undefined") {
      setNotiPerm("unsupported");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotiPerm(perm);
    if (perm === "granted") {
      add({
        type: "normal",
        title: "브라우저 알림 활성화",
        message: "이제 경고 단계 변경 시 브라우저 알림이 표시됩니다.",
      });
    }
  }

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${ui.bg} p-6 shadow-lg ring-1 ${ui.ring}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">대시보드</h2>
          <p className="mt-1 text-sm text-slate-600">
            실시간 착석 상태와 경고 단계를 표시합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`${ui.badge} rounded-full px-3 py-1 text-sm font-bold text-white shadow`}>
            {ui.title}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-white/70">
            업데이트: {seatState.lastUpdate}
          </span>

          {/* 옵션: 브라우저 알림 버튼 */}
          <button
            type="button"
            onClick={requestBrowserNoti}
            disabled={notiPerm === "denied" || notiPerm === "unsupported"}
            className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-white/70 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              notiPerm === "denied"
                ? "브라우저 설정에서 알림 허용이 필요합니다."
                : notiPerm === "unsupported"
                ? "이 브라우저는 Notification API를 지원하지 않습니다."
                : "브라우저 알림을 켭니다."
            }
          >
            🔔 알림 {notiPerm === "granted" ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* 상태 카드 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">착석 상태</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-3xl font-black tracking-tight">
              {seatState.isSeated ? "착석" : "미착석"}
            </div>
            <div className="text-2xl">{seatState.isSeated ? "✅" : "⛔️"}</div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                setSeatState((s) => ({
                  ...s,
                  isSeated: true,
                  seatedMinutes: s.seatedMinutes || 0,
                  level: calcLevel(s.seatedMinutes || 0),
                  lastUpdate: new Date().toLocaleTimeString(),
                }))
              }
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              착석 시작(테스트)
            </button>
            <button
              onClick={() =>
                setSeatState((s) => ({
                  ...s,
                  isSeated: false,
                  seatedMinutes: 0,
                  level: "normal",
                  lastUpdate: new Date().toLocaleTimeString(),
                }))
              }
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              자리 비움(테스트)
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            (현재는 테스트 버튼/타이머로 시뮬레이션 중)
          </p>
        </div>

        {/* 시간 카드 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">현재 착석 시간</div>
          <div className="mt-2 text-3xl font-black tracking-tight">
            {seatState.seatedMinutes}{" "}
            <span className="text-base font-bold text-slate-600">min</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            기준 시간을 초과하면 주의/경고 단계가 올라갑니다.
          </p>

          {/* 테스트용 버튼: 시간 올리기 */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                setSeatState((s) => {
                  const next = s.seatedMinutes + 10;
                  const nextLevel = calcLevel(next);
                  return {
                    ...s,
                    seatedMinutes: next,
                    level: nextLevel,
                    lastUpdate: new Date().toLocaleTimeString(),
                  };
                })
              }
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              +10분(테스트)
            </button>
            <button
              onClick={() =>
                setSeatState((s) => {
                  const next = Math.max(0, s.seatedMinutes - 10);
                  const nextLevel = calcLevel(next);
                  return {
                    ...s,
                    seatedMinutes: next,
                    level: nextLevel,
                    lastUpdate: new Date().toLocaleTimeString(),
                  };
                })
              }
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              -10분(테스트)
            </button>
          </div>
        </div>

        {/* 알림 카드 */}
        <div className="rounded-2xl bg-white/70 p-5 shadow-md ring-1 ring-white/70 backdrop-blur">
          <div className="text-xs font-semibold text-slate-500">경고 안내</div>
          <div className="mt-2 text-lg font-extrabold tracking-tight">{ui.desc}</div>
          <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700 ring-1 ring-white/70">
            배경색은 단계(정상/주의/경고)에 따라 변경됩니다.
          </div>

          <div className="mt-3 text-xs text-slate-500">
            기준: 30분=주의, 60분=경고 (임시)
          </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Tip: 기록 페이지에서 10분 단위 착석 패턴을 확인하세요.
        </div>
        <div className="text-xs text-slate-500">
          (다음) Socket.IO 연결 시 실시간 반영
        </div>
      </div>
    </div>
  );
}
