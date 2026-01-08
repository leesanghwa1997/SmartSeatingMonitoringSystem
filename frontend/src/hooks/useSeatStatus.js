import { useEffect, useRef, useState } from "react";
import { getSeatStatus, getPressureData } from "../api/seat";
import { useNotifications } from "../app/notifications";

const WARN_MIN = 30;
const DANGER_MIN = 60;

export function useSeatStatus() {
  const { add } = useNotifications();

  const [state, setState] = useState(null);
  const prevLevelRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let timer;

    async function load() {
      const seat = await getSeatStatus();
      const pressure = await getPressureData();

      if (seat.isSeated && !startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      if (!seat.isSeated) {
        startTimeRef.current = null;
      }

      const seatedMinutes = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 60000)
        : 0;

      let level = "normal";
      if (seatedMinutes >= DANGER_MIN) level = "danger";
      else if (seatedMinutes >= WARN_MIN) level = "warn";

      // 🔔 알림 트리거 (단계 변경 시)
      if (prevLevelRef.current && prevLevelRef.current !== level) {
        add({
          type: level,
          title: "착석 경고 단계 변경",
          message: `${prevLevelRef.current} → ${level}`,
        });
      }

      prevLevelRef.current = level;

      setState({
        isSeated: seat.isSeated,
        seatedMinutes,
        level,
        detectedAt: seat.detectedAt,
        pressure,
      });
    }

    load();
    timer = setInterval(load, 10_000); // 10초 polling (mock)

    return () => clearInterval(timer);
  }, [add]);

  return state;
}
