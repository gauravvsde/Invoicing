"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGST } from "@/hooks/use-gst"
import { useDealers } from "@/hooks/use-dealers"

// Define the Excel export function outside the component to avoid hook order issues
function useExportToExcel(gstRecords: any[], selectedMonth: number, selectedYear: number, getDealerName: (id?: string) => string) {
  return useCallback((): void => {
    // Prepare the data for export with proper typing
    const data = gstRecords.map((record) => {
      // Format date safely
      const formatDate = (dateString: string): string => {
        try {
          return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Invalid Date';
        }
      };

      return {
        'Date': formatDate(record.date),
        'Type': record.type.charAt(0).toUpperCase() + record.type.slice(1), // Capitalize first letter
        'Description': record.description || 'N/A',
        'Payer': record.customerName || getDealerName(record.dealerId) || 'N/A',
        'GSTIN': record.customerGSTIN || 'N/A',
        'Amount (₹)': record.amount.toFixed(2),
        'GST Rate (%)': record.gstRate ? `${record.gstRate}%` : 'N/A',
        'GST Amount (₹)': (record.gstAmount || 0).toFixed(2),
        'Total (₹)': (record.amount + (record.gstAmount || 0)).toFixed(2),
        'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
        'Payment Status': record.paymentStatus.charAt(0).toUpperCase() + record.paymentStatus.slice(1),
        'Invoice ID': record.invoiceId || 'N/A',
        'Quotation ID': record.quotationId || 'N/A',
        'Month': record.month,
        'Quarter': record.quarter,
        'Year': record.year,
        'Created At': record.createdAt ? formatDate(record.createdAt) : 'N/A',
        'Updated At': record.updatedAt ? formatDate(record.updatedAt) : 'N/A'
      };
    });

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'GST Records');
    
    // Set column widths
    const wscols = [
      { wch: 12 }, // Date
      { wch: 30 }, // Description
      { wch: 15 }, // Type
      { wch: 25 }, // Payer
      { wch: 20 }, // GSTIN
      { wch: 15 }, // Amount
      { wch: 15 }, // GST Amount
      { wch: 15 }, // Total
      { wch: 25 }  // Created At
    ];
    ws['!cols'] = wscols;
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `GST_Records_${selectedMonth}_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [gstRecords, selectedMonth, selectedYear, getDealerName]);
}

export function GSTRecordsTable() {
  // All hooks must be called at the top level, before any conditional returns
  const { gstRecords, loading, error, filters, updateFilters } = useGST()
  const { dealers, loading: dealersLoading } = useDealers()
  
  // Initialize with current filter values or current date
  const [selectedMonth, setSelectedMonth] = useState<number>(filters.month || new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(filters.year || new Date().getFullYear())
  
  // Helper function to get dealer name by ID
  const getDealerName = useCallback((dealerId?: string) => {
    if (!dealerId || !dealers) return 'N/A';
    const dealer = dealers.find(d => d.id === dealerId);
    return dealer ? dealer.name : 'N/A';
  }, [dealers]);
  
  // Get the export function
  const exportToExcel = useExportToExcel(gstRecords, selectedMonth, selectedYear, getDealerName);
  
  // Update filters when month or year changes
  const handleMonthChange = useCallback((value: string) => {
    const month = parseInt(value);
    updateFilters({
      month,
      year: selectedYear
    });
  }, [selectedYear, updateFilters]);

  const handleYearChange = useCallback((value: string) => {
    const year = parseInt(value);
    updateFilters({
      month: selectedMonth,
      year
    });
  }, [selectedMonth, updateFilters]);
  
  // Sync local state with filters when they change
  useEffect(() => {
    if (filters.month && filters.month !== selectedMonth) {
      setSelectedMonth(filters.month);
    }  
    if (filters.year && filters.year !== selectedYear) {
      setSelectedYear(filters.year);
    }
  }, [filters.month, filters.year, selectedMonth, selectedYear]);
  
  // Get unique years from records
  const availableYears = useMemo(() => 
    Array.from(new Set(
      gstRecords.map(record => new Date(record.date).getFullYear())
    )).sort((a, b) => b - a),
    [gstRecords]
  );

  // Filter and sort records by date (newest first) and take the first 10
  const sortedRecords = useMemo(() => {
    if (loading || dealersLoading) return [];
    
    return gstRecords
      .filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === selectedMonth && 
               recordDate.getFullYear() === selectedYear;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [gstRecords, selectedMonth, selectedYear, loading, dealersLoading]);

  // Loading state
  if (loading || dealersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GST Records</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">Loading GST records...</div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GST Records</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive">
          Error loading GST records: {error instanceof Error ? error.message : 'An unknown error occurred'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CardTitle>GST Records</CardTitle>
          <Button 
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={gstRecords.length === 0}
          >
            Export to Excel
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
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
      </CardHeader>
      <CardContent>
        {sortedRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No GST records found</p>
            <p className="text-sm">Add a new GST record to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
          {sortedRecords.map((record, index) => (
            <div 
              key={`${record.id || 'record'}-${index}`} 
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{record.description}</p>
                  {(record.customerName || record.dealerId) && (
                    <p className="text-xs text-muted-foreground">
                      Payer: {record.customerName || getDealerName(record.dealerId)} {record.customerGSTIN ? `(${record.customerGSTIN})` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(record.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>₹{record.amount.toLocaleString()}</span>
                    <span>•</span>
                    <Badge 
                      variant={record.type === "collected" ? "default" : "secondary"} 
                      className="text-xs capitalize"
                    >
                      {record.type}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {record.type === 'collected' ? '+' : '-'}₹{record.gstAmount?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.createdAt || '').toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
