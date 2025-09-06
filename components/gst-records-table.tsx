"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useGST } from "@/hooks/use-gst"
import { useDealers } from "@/hooks/use-dealers"

export function GSTRecordsTable() {
  const { gstRecords, loading, error } = useGST()
  const { dealers, loading: dealersLoading } = useDealers()

  // Sort records by date (newest first) and take the first 10
  const sortedRecords = [...gstRecords]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 10)

  // Helper function to get dealer name by ID
  const getDealerName = (dealerId?: string) => {
    if (!dealerId) return 'N/A';
    const dealer = dealers.find(d => d.id === dealerId);
    return dealer ? dealer.name : 'Loading...';
  };

  if (loading || dealersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent GST Records</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">Loading GST records...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent GST Records</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive">
          Error loading GST records: {error instanceof Error ? error.message : 'An unknown error occurred'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent GST Records</CardTitle>
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
