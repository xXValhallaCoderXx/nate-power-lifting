"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChartCard({
  data,
  color = "#f5a524",
  unit = "kg",
}: {
  data: LinePoint[];
  color?: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet.</p>;
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#2a2f37" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8b929e", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#8b929e", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: "#15181d", border: "1px solid #2a2f37", borderRadius: 12, color: "#fff" }}
            labelStyle={{ color: "#8b929e" }}
            formatter={(v: number) => [`${v} ${unit}`, ""]}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
