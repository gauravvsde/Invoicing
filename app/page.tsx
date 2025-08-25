"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Receipt, TrendingUp, PlusCircle } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import Link from "next/link"
import { useInvoices } from "@/hooks/use-invoices"
import { useQuotations } from "@/hooks/use-quotations"
import { useGST } from "@/hooks/use-gst"
import { GSTChart } from "@/components/gst-chart"
import type { GSTSummary } from "@/types/gst"

export default function Dashboard() {
  const { invoices, loading: invoicesLoading } = useInvoices()
  const { quotations, loading: quotationsLoading } = useQuotations()
  const { gstRecords, getTotalGSTCollected, loading: gstLoading } = useGST()

  const activeInvoices = invoices.filter(
    (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled",
  ).length

  const gstCollected = getTotalGSTCollected()

  const recentActivity = [...invoices, ...quotations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) // Show 5 recent activities

  const last12MonthsChartData = (): GSTSummary[] => {
    const summaries: { [month: string]: GSTSummary } = {}
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    gstRecords.forEach((record) => {
      const recordDate = new Date(record.date)
      if (recordDate < twelveMonthsAgo) return

      const month = record.month

      if (!summaries[month]) {
        summaries[month] = {
          month,
          gstCollected: 0,
          gstPaid: 0,
          netGST: 0,
        }
      }

      if (record.type === "collected") {
        summaries[month].gstCollected += record.gstAmount || 0
      } else if (record.type === "paid") {
        summaries[month].gstPaid += record.gstAmount || 0
      }
    })

    return Object.values(summaries)
      .map((summary) => ({
        ...summary,
        netGST: summary.gstCollected - summary.gstPaid,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const chartData = last12MonthsChartData()

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader title="GST Billing Pro" subtitle="Professional billing and invoice management" />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quotationsLoading ? '...' : quotations.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoicesLoading ? '...' : activeInvoices}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{gstLoading ? '...' : `₹${gstCollected.toLocaleString()}`}</div>
                </CardContent>
              </Card>
            </div>

            {/* GST Chart */}
            <Card>
              <CardHeader>
                <CardTitle>GST Collection Overview</CardTitle>
                <CardDescription>Last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <GSTChart data={chartData} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/invoices">
                  <Button className="w-full justify-start">
                    <Receipt className="mr-2 h-4 w-4" /> Generate Invoice
                  </Button>
                </Link>
                <Link href="/quotations">
                  <Button variant="secondary" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" /> Create Quotation
                  </Button>
                </Link>
                <Link href="/gst">
                  <Button className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" /> View GST Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
                {recentActivity.map((item) => {
                  const isInvoice = 'invoiceNumber' in item
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {isInvoice ? `Invoice #${item.invoiceNumber}` : `Quote #${item.quotationNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.customerName} - ₹{item.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={item.status === "draft" ? "secondary" : "default"}>{item.status}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
