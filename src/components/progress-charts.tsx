"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { DayActivity } from "@/lib/db/stats";

const AXIS = { fontSize: 11, fill: "var(--muted)" };
const tooltipStyle = {
  contentStyle: { background: "var(--paper)", border: "2px solid var(--line)", borderRadius: 14, color: "var(--ink)", fontSize: 12 },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--wash)" },
};
const short = (d: string) => d.slice(5).replace("-", "/");

export function ActivityChart({ data }: { data: DayActivity[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis dataKey="date" tickFormatter={short} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: "var(--ink-soft)" }}>{v}</span>} />
          <Bar dataKey="reviews" name="Reviews" stackId="a" fill="var(--series-1)" stroke="var(--paper)" strokeWidth={2} />
          <Bar dataKey="drills" name="Suffix drills" stackId="a" fill="var(--series-2)" stroke="var(--paper)" strokeWidth={2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WordsChart({ data, start }: { data: DayActivity[]; start: number }) {
  let total = start;
  const series = data.map((d) => ({ date: d.date, words: (total += d.newWords) }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis dataKey="date" tickFormatter={short} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="words" name="Words met" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--paper)", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
