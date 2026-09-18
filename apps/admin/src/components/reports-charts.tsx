"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@getmed/ui";

type Day = { date: string; orders: number; delivered: number; revenue: number; consultations: number };
type Growth = { month: string; approved: number };

const axis = { fontSize: 11, stroke: "#8d9b98" };

export function ReportsCharts({ series, growth }: { series: Day[]; growth: Growth[] }) {
  const weekly = series.reduce<Day[]>((acc, d, i) => { if (i % 7 === 0) acc.push({ ...d }); else { const w = acc[acc.length - 1]!; w.orders += d.orders; w.delivered += d.delivered; w.revenue += d.revenue; w.consultations += d.consultations; } return acc; }, []);
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Orders per week</CardTitle></CardHeader><CardContent className="h-56">
        <ResponsiveContainer><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" stroke="#eef0f0" /><XAxis dataKey="date" tick={axis} tickFormatter={(d: string) => d.slice(5)} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Bar dataKey="orders" fill="#23968a" radius={[4, 4, 0, 0]} /><Bar dataKey="delivered" fill="#aee4da" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Revenue per week (flat fees)</CardTitle></CardHeader><CardContent className="h-56">
        <ResponsiveContainer><AreaChart data={weekly}><CartesianGrid strokeDasharray="3 3" stroke="#eef0f0" /><XAxis dataKey="date" tick={axis} tickFormatter={(d: string) => d.slice(5)} /><YAxis tick={axis} /><Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} /><Area dataKey="revenue" stroke="#0f7a73" fill="#d5f2ec" /></AreaChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Approved pharmacies (cumulative)</CardTitle></CardHeader><CardContent className="h-56">
        <ResponsiveContainer><LineChart data={growth}><CartesianGrid strokeDasharray="3 3" stroke="#eef0f0" /><XAxis dataKey="month" tick={axis} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Line dataKey="approved" stroke="#0f7a73" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Consultation requests per week</CardTitle></CardHeader><CardContent className="h-56">
        <ResponsiveContainer><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" stroke="#eef0f0" /><XAxis dataKey="date" tick={axis} tickFormatter={(d: string) => d.slice(5)} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Bar dataKey="consultations" fill="#ffa41f" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
      </CardContent></Card>
    </div>
  );
}
