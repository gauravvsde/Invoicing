"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, DollarSign, FileText, Plus, Download, Search, ArrowLeft } from "lucide-react"
import { GSTChart } from "@/components/gst-chart"
import { GSTRecordsTable } from "@/components/gst-records-table"
import { GSTReturnsTable } from "@/components/gst-returns-table"
import { AddGSTRecordDialog } from "@/components/add-gst-record-dialog"
import { PDFGenerator } from "@/lib/pdf-generator"
import { useGST } from "@/hooks/use-gst"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FirestoreError } from "firebase/firestore"

export default function GSTDashboard() {
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  // Set a loading timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true)
    }, 10000) // 10 seconds timeout
    
    return () => clearTimeout(timer)
  }, [])
  
  const {
    loading: gstLoading,
    gstRecords = [],
    gstReturns = [],
    getTotalGSTCollected,
    getTotalGSTPaid,
    getNetGSTLiability,
    getCurrentMonthSummary,
    getGSTSummary,
    fileGSTReturn,
    error: gstError
  } = useGST()
  
  const loading = gstLoading && !loadingTimeout
  const router = useRouter()
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading GST data...</p>
          {loadingTimeout && !gstError && (
            <div className="mt-4 text-yellow-600 bg-yellow-50 p-3 rounded-md">
              <p>Taking longer than expected. Please check your internet connection.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-blue-600 hover:underline"
              >
                Reload Page
              </button>
            </div>
          )}
          {gstError && (
            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-md">
              <p>Error loading GST data: {typeof gstError === 'string' ? gstError : gstError.message}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const totalCollected = getTotalGSTCollected()
  const totalPaid = getTotalGSTPaid()
  const netLiability = getNetGSTLiability()
  const currentMonth = getCurrentMonthSummary()
  
  // Get all available periods from gstRecords
  const allPeriods = [...new Set(
    gstRecords.map(record => record.month).filter(Boolean)
  )]
  
  // Get summaries for all periods
  const summaries = allPeriods.map(period => getGSTSummary(period))

  const filteredSummaries = summaries.filter((summary) => {
    if (!summary || !summary.month) return false;
    const period = summary.month;
    const periodDate = new Date(period + "-01");

    const matchesSearch =
      searchTerm === "" ||
      period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      periodDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }).toLowerCase().includes(searchTerm.toLowerCase());

    const currentYear = new Date().getFullYear().toString();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "current-year" && period.startsWith(currentYear)) ||
      (dateFilter === "last-6-months" && periodDate >= sixMonthsAgo);

    return matchesSearch && matchesDate;
  });

  const handleCreateMonthlyReturn = async () => {
    try {
      const now = new Date()
      const period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`
      const records = gstRecords.filter(record => record.month === period)
      await fileGSTReturn(period, records, 'monthly')
    } catch (error) {
      console.error("Error creating monthly return:", error)
    }
  }

  const handleCreateQuarterlyReturn = async () => {
    try {
      const now = new Date()
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      const period = `${now.getFullYear()}-Q${quarter}`
      const records = gstRecords.filter(record => record.quarter === period)
      await fileGSTReturn(period, records, 'quarterly')
    } catch (error) {
      console.error("Error creating quarterly return:", error)
    }
  }

  const handleExportReport = () => {
    const pdfGenerator = new PDFGenerator()
    pdfGenerator.generateGSTReportPDF(filteredSummaries, "GST Summary Report")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-heading text-foreground">GST Dashboard</h1>
                <p className="text-sm text-muted-foreground">Track and manage GST collections and payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowAddRecord(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add GST Record
              </Button>
              <Button variant="outline" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* GST Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total output tax</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Paid</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₹{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total input tax credit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net GST Liability</CardTitle>
              <DollarSign className={`h-4 w-4 ${netLiability >= 0 ? "text-red-600" : "text-green-600"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netLiability >= 0 ? "text-red-600" : "text-green-600"}`}>
                ₹{Math.abs(netLiability).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{netLiability >= 0 ? "Amount to pay" : "Refund due"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(currentMonth?.gstCollected || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Net GST for the current month</p>
            </CardContent>
          </Card>
        </div>

        {/* GST Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>GST Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <GSTChart data={summaries.slice(0, 6).reverse()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start bg-transparent"
                variant="outline"
                onClick={handleCreateMonthlyReturn}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Monthly Return
              </Button>
              <Button
                className="w-full justify-start bg-transparent"
                variant="outline"
                onClick={handleCreateQuarterlyReturn}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Quarterly Return
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Download GST Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GST records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Monthly GST Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Month</th>
                    <th className="text-right py-3 px-2">GST Collected</th>
                    <th className="text-right py-3 px-2">GST Paid</th>
                    <th className="text-right py-3 px-2">Net GST</th>
                    <th className="text-right py-3 px-2">Invoices</th>
                    <th className="text-right py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.slice(0, 12).map((summary) => {
                    if (!summary) return null;
                    const periodDate = new Date(summary.month + "-01");

                    return (
                      <tr key={summary.month} className="border-b">
                        <td className="py-3 px-2 font-medium">
                          {periodDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </td>
                        <td className="text-right py-3 px-2 text-green-600">₹{summary.gstCollected.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 text-blue-600">₹{summary.gstPaid.toLocaleString()}</td>
                        <td className={`text-right py-3 px-2 font-medium ${summary.netGST >= 0 ? "text-red-600" : "text-green-600"}`}>
                          ₹{summary.netGST.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2">-</td>
                        <td className="text-right py-3 px-2">
                          <Badge variant={summary.netGST > 0 ? "destructive" : "outline"}>
                            Unfiled
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* GST Records and Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GSTRecordsTable />
          <GSTReturnsTable />
        </div>
      </main>

      {/* Add GST Record Dialog */}
      <AddGSTRecordDialog 
        open={showAddRecord} 
        onClose={() => setShowAddRecord(false)} 
        onSuccess={() => {
          setShowAddRecord(false);
          // Optionally refresh the data
        }}
      />
    </div>
  )
}
