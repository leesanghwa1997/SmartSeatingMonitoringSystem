import { useSeatStatus } from "../hooks/useSeatStatus";
import { useMemo, useState } from "react";
import { toChartData } from "../utils/transformSensors";
import { calcSensorAverage } from "../utils/calcSensorAverage";
import SensorBarChart from "../components/SensorBarChart";
import AveragePressureChart from "../components/AveragePressureChart";

/**
 * 🧪 테스트용 평균 히스토리 (10분 단위)
 * 실제로는 백엔드에서 내려오게 될 구조
 */
function buildMockAverageHistory(baseAvg) {
  return [
    { time: "09:00", avg: baseAvg - 40 },
    { time: "09:10", avg: baseAvg - 25 },
    { time: "09:20", avg: baseAvg - 10 },
    { time: "09:30", avg: baseAvg },
    { time: "09:40", avg: baseAvg + 15 },
    { time: "09:50", avg: baseAvg + 25 },
  ];
}

export default function RecordsPage() {
  const data = useSeatStatus();
  const [testSensors, setTestSensors] = useState(null);

  /** 🔌 실제 or 테스트 센서 */
  const rawSensors = testSensors ?? data?.sensors ?? null;

  /** 📊 센서별 차트 데이터 */
  const chartData = useMemo(
    () => (rawSensors ? toChartData(rawSensors) : []),
    [rawSensors]
  );

  /** 📈 현재 센서 평균 */
  const currentAverage = useMemo(
    () => (rawSensors ? calcSensorAverage(rawSensors) : null),
    [rawSensors]
  );

  /** ⏱ 평균 히스토리 (mock) */
  const averageHistory = useMemo(
    () => (currentAverage ? buildMockAverageHistory(currentAverage) : []),
    [currentAverage]
  );

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">착석 기록</h2>
          <p className="mt-1 text-sm text-slate-600">
            압력 센서 기반 착석 분포 및 평균 변화를 확인합니다.
          </p>
        </div>

        {/* 🧪 테스트 버튼 */}
        <button
          onClick={() =>
            setTestSensors({
              seat_front: 312,
              seat_back: 280,
              seat_left: 295,
              seat_right: 300,
              back_front: 120,
              back_back: 90,
              back_left: 110,
              back_right: 100,
            })
          }
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          테스트 센서 주입
        </button>
      </div>

      {!rawSensors ? (
        <div className="mt-10 text-center text-sm text-slate-500">
          센서 데이터가 아직 없습니다.
        </div>
      ) : (
        <>
          {/* 🔢 센서 카드 */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {chartData.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="text-xs font-semibold text-slate-500">
                  {item.label}
                </div>
                <div className="mt-1 text-2xl font-extrabold">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* 📊 센서 분포 그래프 */}
          <div className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span>
              <div className="font-extrabold">압력 분포 그래프</div>
            </div>

            {/* ⭐ height 필수 */}
            <div className="h-[320px]">
              <SensorBarChart data={chartData} />
            </div>
          </div>

          {/* ⏱ 평균 압력 히스토리 */}
          <div className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">⏱</span>
              <div className="font-extrabold">
                시간별 평균 압력 (10분 단위)
              </div>
            </div>

            {/* ⭐ height 필수 */}
            <div className="h-[280px]">
              <AveragePressureChart data={averageHistory} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
