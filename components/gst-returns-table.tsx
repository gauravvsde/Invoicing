"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Eye } from "lucide-react"
import type { GSTReturn } from "@/types/gst"

interface GSTReturnsTableProps {
  gstReturns: GSTReturn[];
  onUpdateReturn: (id: string, updates: Partial<GSTReturn>) => Promise<void>;
  isLoading: boolean;
}

export function GSTReturnsTable({ gstReturns = [], onUpdateReturn, isLoading }: GSTReturnsTableProps) {
  const handleMarkFiled = async (id: string) => {
    try {
      await onUpdateReturn(id, {
        status: "filed",
        filedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating GST return:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "filed":
        return "default"
      case "paid":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GST Returns</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : gstReturns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No GST returns found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gstReturns.slice(0, 10).map((gstReturn, index) => (
              <div key={`${gstReturn.id || 'return'}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {gstReturn.type.toUpperCase()} - {gstReturn.period}
                    </p>
                    <Badge variant={getStatusColor(gstReturn.status)}>{gstReturn.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(gstReturn.dueDate).toLocaleDateString()}
                    {gstReturn.filedAt && ` • Filed: ${new Date(gstReturn.filedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{Math.abs(gstReturn.netGST).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{gstReturn.netGST >= 0 ? "To Pay" : "Refund"}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3" />
                  </Button>
                  {gstReturn.status === "draft" && (
                    <Button size="sm" onClick={() => handleMarkFiled(gstReturn.id || '')}>
                      <FileText className="h-3 w-3 mr-1" />
                      File
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
