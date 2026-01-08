import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function AveragePressureChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="avg" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#0f172a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
