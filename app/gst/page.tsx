"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FirestoreError } from "firebase/firestore"
import { toast } from "sonner"
import type { TimeRange } from "@/types/gst-filters"
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
import { GSTFilters } from "@/components/gst/gst-filters"
import { PDFGenerator } from "@/lib/pdf-generator"
import { useGST } from "@/hooks/use-gst"

export default function GSTDashboard() {
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
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
    error: gstError,
    filters,
    updateFilters,
    timeRange,
    exportToExcel
  } = useGST()
  
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>('monthly')
  
  const loading = gstLoading && !loadingTimeout
  const router = useRouter()
  const [showAddRecord, setShowAddRecord] = useState(false)

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
    
    // Parse the period (format: 'YYYY-MM')
    const [year, month] = summary.month.split('-').map(Number);
    
    // Apply filters
    if (filters.year && year !== filters.year) return false;
    if (filters.month && month !== filters.month) return false;
    
    const periodDate = new Date(year, month - 1);
    const periodString = summary.month; // Use the month as the period string
    
    const matchesSearch =
      searchTerm === "" ||
      periodString.toLowerCase().includes(searchTerm.toLowerCase()) ||
      periodDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }).toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleCreateMonthlyReturn = async () => {
    try {
      const now = new Date()
      const period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`
      const records = gstRecords.filter(record => record.month === period)
      // TODO: Implement fileGSTReturn or use appropriate function
      console.log("Would file monthly return for period:", period, "with", records.length, "records")
    } catch (error) {
      console.error("Error creating monthly return:", error)
      toast.error("Failed to create monthly return")
    }
  }

  const handleCreateQuarterlyReturn = async () => {
    try {
      const now = new Date()
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      const period = `${now.getFullYear()}-Q${quarter}`
      const records = gstRecords.filter(record => record.quarter === period)
      // TODO: Implement fileGSTReturn or use appropriate function
      console.log("Would file quarterly return for period:", period, "with", records.length, "records")
    } catch (error) {
      console.error("Error creating quarterly return:", error)
      toast.error("Failed to create quarterly return")
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
        {/* GST Filters */}
        <div className="mb-8">
          <GSTFilters 
            filters={filters}
            timeRange={currentTimeRange}
            onFilterChange={updateFilters}
            onTimeRangeChange={(newTimeRange) => setCurrentTimeRange(newTimeRange as TimeRange)}
            onExport={async (includeDetails) => {
              try {
                const success = await exportToExcel({ 
                  ...filters, 
                  includeDetails 
                });
                if (success) {
                  toast.success(includeDetails 
                    ? 'Full report exported successfully' 
                    : 'Summary exported successfully');
                } else {
                  throw new Error('Export failed');
                }
                return success;
              } catch (error) {
                toast.error('Failed to export. Please try again.');
                return false;
              }
            }}
          />
        </div>
        
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
          <div className="flex gap-2">
            <Select 
              value={currentTimeRange} 
              onValueChange={(value) => {
                const newTimeRange = value as 'monthly' | 'yearly'
                setCurrentTimeRange(newTimeRange)
                
                // When switching to yearly view, remove the month filter
                if (newTimeRange === 'yearly') {
                  updateFilters({ month: undefined })
                } else {
                  // When switching back to monthly view, set to current month if not set
                  updateFilters({ 
                    month: filters.month || new Date().getMonth() + 1 
                  })
                }
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            
            {currentTimeRange === 'monthly' && (
              <Select
                value={filters.month?.toString() || ''}
                onValueChange={(value) => updateFilters({ month: parseInt(value) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = new Date(0, i).toLocaleString('default', { month: 'long' })
                    return (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            
            <Select
              value={filters.year?.toString() || ''}
              onValueChange={(value) => updateFilters({ year: parseInt(value) })}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          {timeRange === 'monthly' && (
            <Select 
              value={filters.month?.toString() || ''}
              onValueChange={(value) => updateFilters({ month: parseInt(value) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: new Date(0, i).toLocaleString('default', { month: 'long' })
                })).map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select 
            value={filters.year?.toString() || ''}
            onValueChange={(value) => updateFilters({ year: parseInt(value) })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
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
          <GSTReturnsTable 
            gstReturns={gstReturns}
            onUpdateReturn={async (id, updates) => {
              // TODO: Implement update GST return functionality
              console.log("Would update GST return", id, "with", updates);
              toast.info("Update GST return functionality coming soon");
            }}
            isLoading={loading}
          />
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
