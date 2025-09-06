'use client'

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GSTFilterOptions, TimeRange } from "@/types/gst-filters"
import { Download } from "lucide-react"
import { useState } from "react"

interface GSTFiltersProps {
  filters: GSTFilterOptions
  timeRange: TimeRange
  onFilterChange: (filters: Partial<GSTFilterOptions>) => void
  onTimeRangeChange: (range: TimeRange) => void
  onExport: (includeDetails: boolean) => Promise<boolean>
}

export function GSTFilters({
  filters,
  timeRange,
  onFilterChange,
  onTimeRangeChange,
  onExport
}: GSTFiltersProps) {
  const [isExporting, setIsExporting] = useState(false)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  const handleExport = async (includeDetails: boolean) => {
    try {
      setIsExporting(true)
      await onExport(includeDetails)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Time Range</label>
          <div className="flex border rounded-md overflow-hidden w-full">
            <button
              type="button"
              className={`flex-1 py-2 px-3 text-sm ${timeRange === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => onTimeRangeChange('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 text-sm ${timeRange === 'yearly' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => onTimeRangeChange('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Year</label>
          <Select
            value={filters.year.toString()}
            onValueChange={(value) => onFilterChange({ year: parseInt(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {timeRange === 'monthly' && (
          <div>
            <label className="text-sm font-medium mb-1 block">Month</label>
            <Select
              value={filters.month?.toString() || ''}
              onValueChange={(value) => onFilterChange({ month: parseInt(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-1 block">Type</label>
          <Select
            value={filters.type || 'all'}
            onValueChange={(value) => onFilterChange({ type: value as any })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="relative group">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport(false)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            Export Summary
          </Button>
          <div className="absolute right-0 mt-1 w-48 bg-popover text-popover-foreground text-sm p-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Export summary data to Excel
          </div>
        </div>
        
        <div className="relative group">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport(true)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            Export Full Report
          </Button>
          <div className="absolute right-0 mt-1 w-48 bg-popover text-popover-foreground text-sm p-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Export detailed report with all records
          </div>
        </div>
      </div>
    </div>
  )
}
