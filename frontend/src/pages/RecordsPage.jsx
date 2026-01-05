export default function RecordsPage() {
  // TODO: 10분 단위 집계 데이터를 받아서 그래프 표시
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">착석 기록</h2>
          <p className="mt-1 text-sm text-slate-600">
            10분 단위로 집계된 착석 시간을 그래프로 표시합니다.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          조회 범위: 최근 N시간 (추후 설정)
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">오늘 총 착석</div>
          <div className="mt-2 text-2xl font-black">— min</div>
          <div className="mt-2 text-sm text-slate-600">집계 데이터 기반</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">최장 연속 착석</div>
          <div className="mt-2 text-2xl font-black">— min</div>
          <div className="mt-2 text-sm text-slate-600">세션 기반</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">경고 발생</div>
          <div className="mt-2 text-2xl font-black">— 회</div>
          <div className="mt-2 text-sm text-slate-600">단계 변화 카운트</div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800">착석 기록 그래프</div>
          <div className="text-xs text-slate-500">단위: 10분</div>
        </div>

        <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-700">그래프 영역</div>
            <div className="mt-1 text-xs text-slate-500">
              (다음 단계) Recharts/Chart.js로 막대그래프 표시
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
