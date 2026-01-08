import { useSeatStatus } from "../hooks/useSeatStatus";

export default function RecordsPage() {
  const data = useSeatStatus();
  if (!data) return <div className="p-6">로딩 중...</div>;

  const sensors = data.pressure.sensors;

  return (
    <div className="rounded-3xl bg-white p-6 shadow ring-1 ring-slate-200">
      <h2 className="text-xl font-extrabold mb-4">착석 기록</h2>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(sensors).map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="text-xs text-slate-500">{key}</div>
            <div className="text-2xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        ※ 10분 단위 평균 그래프는 추후 확장 예정
      </p>
    </div>
  );
}
