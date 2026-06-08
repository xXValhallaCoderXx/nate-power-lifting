"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface BarPoint {
  label: string;
  value: number;
}

export function BarChartCard({
  data,
  color = "#22c55e",
  unit = "kg",
}: {
  data: BarPoint[];
  color?: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet.</p>;
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#2a2f37" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8b929e", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8b929e", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ fill: "#ffffff10" }}
            contentStyle={{ background: "#15181d", border: "1px solid #2a2f37", borderRadius: 12, color: "#fff" }}
            labelStyle={{ color: "#8b929e" }}
            formatter={(v: number) => [`${v} ${unit}`, ""]}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
