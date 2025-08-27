"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Download, Send, DollarSign, Loader2 } from "lucide-react"
import { PDFGenerator } from "@/lib/pdf-generator"
import { usePdfGenerator } from "@/hooks/use-pdf-generator"
import type { Invoice } from "@/types/invoice"

interface InvoiceViewProps {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onPayment: () => void
  onDuplicate: () => void
}

export function InvoiceView({ invoice, onClose, onEdit, onPayment, onDuplicate }: InvoiceViewProps) {
  const { generateInvoicePdf } = usePdfGenerator()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isGeneratingPdf) return
    
    setIsGeneratingPdf(true)
    try {
      console.log('🟡 [InvoiceView] Starting PDF generation for:', {
        invoiceNumber: invoice.invoiceNumber,
        itemsCount: invoice.items?.length || 0,
        total: invoice.totalAmount
      })
      
      const result = await generateInvoicePdf(invoice)
      console.log('🟢 [InvoiceView] PDF generation result:', result)
      
      if (!result) {
        throw new Error('Failed to generate PDF: No result returned')
      }
    } catch (error) {
      console.error('❌ [InvoiceView] Error generating PDF:', error)
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSendInvoice = () => {
    // TODO: Implement send invoice functionality
    console.log("Sending invoice:", invoice.id)
  }

  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "sent":
        return "default"
      case "paid":
        return "default"
      case "overdue":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-heading text-foreground">{invoice.invoiceNumber}</h1>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(invoice.createdAt).toLocaleDateString()}
                  {invoice.quotationId && <span className="ml-4">From Quotation</span>}
                </p>
              </div>
              <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onDuplicate}>Duplicate</Button>
              <Button variant="outline" onClick={handleSendInvoice}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                <Button onClick={onPayment}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Invoice Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">Bill To:</h2>
                  <div className="space-y-1">
                    <p className="font-semibold">{invoice.customerName}</p>
                    {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
                    {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                    {invoice.customerAddress && <p className="whitespace-pre-line">{invoice.customerAddress}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold mb-4">Invoice Details:</h2>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Number:</span> {invoice.invoiceNumber}
                    </p>
                    <p>
                      <span className="font-medium">Date:</span> {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                    {invoice.dueDate && (
                      <p>
                        <span className="font-medium">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2" variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </p>
                    {invoice.paidDate && (
                      <p className="text-green-600">
                        <span className="font-medium">Paid:</span> {new Date(invoice.paidDate).toLocaleDateString()}
                        {invoice.paidAmount && ` - ₹${invoice.paidAmount.toLocaleString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Description</th>
                      <th className="text-right py-3 px-2">Qty</th>
                      <th className="text-right py-3 px-2">Rate</th>
                      <th className="text-right py-3 px-2">GST%</th>
                      <th className="text-right py-3 px-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-2">
                          <div className="whitespace-pre-line">{item.description}</div>
                        </td>
                        <td className="text-right py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">₹{item.rate.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">{item.gstRate}%</td>
                        <td className="text-right py-3 px-2">
                          ₹{(item.quantity * item.rate * (1 + item.gstRate / 100)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{invoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{invoice.gstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{invoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
