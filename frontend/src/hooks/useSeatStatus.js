import { useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "../app/notifications";

/**
 * 경고 단계 계산
 * 기준 (임시):
 *  - 30분 이상: warn
 *  - 60분 이상: danger
 */
function calcLevel(minutes) {
  if (minutes >= 60) return "danger";
  if (minutes >= 30) return "warn";
  return "normal";
}

export function useSeatStatus() {
  const { add, enabled } = useNotifications();

  // ===============================
  // Mock 상태 (추후 API / WS 대체)
  // ===============================
  const [isSeated, setIsSeated] = useState(true);
  const [seatedMinutes, setSeatedMinutes] = useState(0);
  const [detectedAt, setDetectedAt] = useState(
    new Date().toISOString()
  );

  // ===============================
  // ⏱ 착석 타이머 (1분 = 60초)
  // ===============================
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timer = setInterval(() => {
      if (!isSeated) return;

      setSeatedMinutes((m) => m + 1);
      setDetectedAt(new Date().toISOString());
    }, 60_000); // ✅ 1분

    return () => clearInterval(timer);
  }, [isSeated]);

  // ===============================
  // 경고 단계
  // ===============================
  const level = useMemo(
    () => calcLevel(seatedMinutes),
    [seatedMinutes]
  );

  // ===============================
  // 🔔 알림 트리거 (warn → danger)
  // ===============================
  const prevLevelRef = useRef(level);

  useEffect(() => {
    const prev = prevLevelRef.current;
    const next = level;

    if (prev === "warn" && next === "danger") {
      // 🔔 앱 내 알림
      add({
        type: "danger",
        title: "경고 단계 변경",
        message: "장시간 상태가 감지되었습니다.",
      });

      // 🔔 OS 알림 (ON일 때만)
      if (enabled && "Notification" in window) {
        (async () => {
          try {
            if (Notification.permission === "default") {
              await Notification.requestPermission();
            }
            if (Notification.permission === "granted") {
              new Notification("착석 경고", {
                body: "장시간 상태가 감지되었습니다. 휴식을 권장합니다.",
              });
            }
          } catch {
            // 권한 오류 무시
          }
        })();
      }
    }

    prevLevelRef.current = next;
  }, [level, add, enabled]);

  // ===============================
  // 🧪 테스트용 조작 API
  // ===============================
  const __test = useMemo(
    () => ({
      startSeated() {
        setIsSeated(true);
        setDetectedAt(new Date().toISOString());
      },
      stopSeated() {
        setIsSeated(false);
        setSeatedMinutes(0);
        setDetectedAt(new Date().toISOString());
      },
      addMinutes(n) {
        setSeatedMinutes((m) => Math.max(0, m + n));
        setDetectedAt(new Date().toISOString());
      },
      subMinutes(n) {
        setSeatedMinutes((m) => Math.max(0, m - n));
        setDetectedAt(new Date().toISOString());
      },
    }),
    []
  );

  // ===============================
  // 반환
  // ===============================
  return {
    isSeated,
    seatedMinutes,
    detectedAt,
    level,
    __test, // 테스트 UI에서 사용
  };
}
