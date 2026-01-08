import { calcSensorAverage } from "./calcSensorAverage";

/**
 * 센서 스냅샷 배열 → 평균 히스토리
 * @param {Array<{timestamp: string, sensors: object}>} snapshots
 */
export function buildAverageHistory(snapshots) {
  return snapshots.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avg: calcSensorAverage(item.sensors),
  }));
}
