"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { GSTSummary } from "@/types/gst"

interface GSTChartProps {
  data: GSTSummary[]
}

export function GSTChart({ data }: GSTChartProps) {
  const chartData = data.map((item) => ({
    month: new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    collected: item.gstCollected,
    paid: item.gstPaid,
    net: item.netGST,
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value: number, name: string) => [
              `₹${value.toLocaleString()}`,
              name === "collected" ? "GST Collected" : name === "paid" ? "GST Paid" : "Net GST",
            ]}
          />
          <Line type="monotone" dataKey="collected" stroke="#16a34a" strokeWidth={2} />
          <Line type="monotone" dataKey="paid" stroke="#2563eb" strokeWidth={2} />
          <Line type="monotone" dataKey="net" stroke="#dc2626" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
