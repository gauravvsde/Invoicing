"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Edit, Download, Send, ArrowRight } from "lucide-react"
import { useInvoices } from "@/hooks/use-invoices"
import { usePdfGenerator } from "@/hooks/use-pdf-generator"
import type { Quotation } from "@/types/quotation"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface QuotationViewProps {
  quotation: Quotation
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCreateInvoice: () => void
}

export function QuotationView({ quotation, onClose, onEdit, onDuplicate, onCreateInvoice }: QuotationViewProps) {
  const { createInvoiceFromQuotation } = useInvoices()
  const { generateQuotationPdf } = usePdfGenerator()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const router = useRouter()

  const handleConvertToInvoice = () => {
    const invoiceId = createInvoiceFromQuotation(quotation)
    if (invoiceId) {
      router.push(`/invoices?edit=${invoiceId}`)
    }
  }

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isGeneratingPdf) return
    
    setIsGeneratingPdf(true)
    try {
      console.log('🟡 [QuotationView] Starting PDF generation for:', {
        quotationNumber: quotation.quotationNumber,
        itemsCount: quotation.items?.length || 0,
        total: quotation.totalAmount
      })
      
      const result = await generateQuotationPdf(quotation)
      console.log('🟢 [QuotationView] PDF generation result:', result)
      
      if (!result) {
        throw new Error('Failed to generate PDF: No result returned')
      }
    } catch (error) {
      console.error('❌ [QuotationView] Error generating PDF:', error)
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSendQuotation = () => {
    console.log("Sending quotation:", quotation.id)
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
                <h1 className="text-2xl font-bold font-heading text-foreground">{quotation.quotationNumber}</h1>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(quotation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant={
                  quotation.status === "draft" ? "secondary" : quotation.status === "sent" ? "default" : "outline"
                }
              >
                {quotation.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDuplicate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleConvertToInvoice}
              >
                Convert to Invoice
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Quotation Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">From:</h2>
                  <div className="space-y-1">
                    {quotation.companyLogo && (
                      <img
                        src={quotation.companyLogo || "/placeholder.svg"}
                        alt="Company Logo"
                        className="h-12 w-auto mb-2"
                      />
                    )}
                    <p className="font-semibold">{quotation.companyName || "Your Company"}</p>
                    {quotation.companyEmail && <p>{quotation.companyEmail}</p>}
                    {quotation.companyPhone && <p>{quotation.companyPhone}</p>}
                    {quotation.companyAddress && <p className="whitespace-pre-line">{quotation.companyAddress}</p>}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-4">Bill To:</h2>
                  <div className="space-y-1">
                    <p className="font-semibold">{quotation.customerName}</p>
                    {quotation.customerEmail && <p>{quotation.customerEmail}</p>}
                    {quotation.customerPhone && <p>{quotation.customerPhone}</p>}
                    {quotation.customerAddress && <p className="whitespace-pre-line">{quotation.customerAddress}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-8 text-right">
                <h2 className="text-xl font-bold mb-4">Quotation Details:</h2>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Number:</span> {quotation.quotationNumber}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {new Date(quotation.createdAt).toLocaleDateString()}
                  </p>
                  {quotation.validUntil && (
                    <p>
                      <span className="font-medium">Valid Until:</span>{" "}
                      {new Date(quotation.validUntil).toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Status:</span>
                    <Badge
                      className="ml-2"
                      variant={
                        quotation.status === "draft" ? "secondary" : quotation.status === "sent" ? "default" : "outline"
                      }
                    >
                      {quotation.status}
                    </Badge>
                  </p>
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
                      <th className="text-right py-3 px-2">SGST</th>
                      <th className="text-right py-3 px-2">CGST</th>
                      <th className="text-right py-3 px-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item, index) => {
                      const itemTotal = item.quantity * item.rate
                      const gstAmount = itemTotal * (item.gstRate / 100)
                      const sgst = gstAmount / 2
                      const cgst = gstAmount / 2
                      return (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 px-2">
                            <div className="whitespace-pre-line">{item.description}</div>
                          </td>
                          <td className="text-right py-3 px-2">{item.quantity}</td>
                          <td className="text-right py-3 px-2">₹{item.rate.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{item.gstRate}%</td>
                          <td className="text-right py-3 px-2">₹{sgst.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">₹{cgst.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">₹{(itemTotal + gstAmount).toLocaleString()}</td>
                        </tr>
                      )
                    })}
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
                    <span>₹{quotation.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>₹{(quotation.sgstAmount || quotation.gstAmount / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>₹{(quotation.cgstAmount || quotation.gstAmount / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{quotation.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {quotation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
