"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { DayActivity } from "@/lib/db/stats";

const AXIS = { fontSize: 11, fill: "var(--muted)" };
const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--fg)", fontSize: 12 },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--card-2)" },
};
const short = (d: string) => d.slice(5).replace("-", "/");

export function ActivityChart({ data }: { data: DayActivity[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis dataKey="date" tickFormatter={short} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
          <Bar dataKey="reviews" name="Reviews · Tekrar" stackId="a" fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
          <Bar dataKey="drills" name="Suffix drills · Ekler" stackId="a" fill="var(--series-2)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
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
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis dataKey="date" tickFormatter={short} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="words" name="Words met · Kelimeler" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
