/**
 * 8개 압력 센서 평균 계산
 * @param {object} sensors
 * @returns {number|null}
 */
export function calcSensorAverage(sensors) {
  if (!sensors) return null;

  const values = Object.values(sensors).filter(
    (v) => typeof v === "number"
  );

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}
