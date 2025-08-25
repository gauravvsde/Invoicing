"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Eye, Receipt, DollarSign, ArrowLeft, Copy, Trash2 } from "lucide-react"
import { InvoiceForm } from "@/components/invoice-form"
import { InvoiceView } from "@/components/invoice-view"
import { PaymentDialog } from "@/components/payment-dialog"
import { useInvoices } from "@/hooks/use-invoices"
import type { Invoice } from "@/types/invoice"
import { useRouter } from "next/navigation"

export default function InvoicesPage() {
  const { invoices, loading, addPayment, duplicateInvoice, deleteInvoice } = useInvoices()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [amountFilter, setAmountFilter] = useState("all")

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchTerm === "" ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.invoiceName && invoice.invoiceName.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "this-month" && new Date(invoice.createdAt).getMonth() === new Date().getMonth()) ||
      (dateFilter === "last-30-days" &&
        new Date(invoice.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === "overdue" &&
        invoice.dueDate &&
        new Date(invoice.dueDate) < new Date() &&
        invoice.status !== "paid")

    const matchesAmount =
      amountFilter === "all" ||
      (amountFilter === "under-10k" && invoice.totalAmount < 10000) ||
      (amountFilter === "10k-50k" && invoice.totalAmount >= 10000 && invoice.totalAmount < 50000) ||
      (amountFilter === "over-50k" && invoice.totalAmount >= 50000)

    return matchesSearch && matchesStatus && matchesDate && matchesAmount
  })

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowForm(true)
  }

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowView(true)
  }

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPayment(true)
  }

  const handleDuplicate = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation()
    const duplicatedId = await duplicateInvoice(invoice.id)
    if (duplicatedId) {
      window.location.reload()
    }
  }

  const handleDelete = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteInvoice) {
      try {
        await deleteInvoice(invoice.id)
      } catch (error) {
        console.error('Error deleting invoice:', error)
      }
    }
  }

  const handleNew = () => {
    setSelectedInvoice(null)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setShowView(false)
    setShowPayment(false)
    setSelectedInvoice(null)
  }

  const handlePaymentSubmit = (paidAmount: number, paidDate: string) => {
    if (selectedInvoice) {
      addPayment(selectedInvoice.id, paidAmount, paidDate, "Online", "Payment received")
      setShowPayment(false)
      setSelectedInvoice(null)
    }
  }

  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "sent":
        return "default"
      case "paid":
        return "default"
      case "partially_paid":
        return "outline"
      case "overdue":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getDueAmount = (invoice: Invoice) => {
    return invoice.totalAmount - (invoice.paidAmount || 0)
  }

  if (showForm) {
    return <InvoiceForm invoice={selectedInvoice} onClose={handleClose} />
  }

  if (showView && selectedInvoice) {
    return (
      <InvoiceView
        invoice={selectedInvoice}
        onClose={handleClose}
        onEdit={() => handleEdit(selectedInvoice)}
        onPayment={() => handlePayment(selectedInvoice)}
        onDuplicate={() => handleDuplicate(selectedInvoice, { stopPropagation: () => {} } as React.MouseEvent)}
      />
    )
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
                <h1 className="text-2xl font-bold font-heading text-foreground">Invoice Management</h1>
                <p className="text-sm text-muted-foreground">Create and manage invoices</p>
              </div>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Amount" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amounts</SelectItem>
              <SelectItem value="under-10k">Under ₹10K</SelectItem>
              <SelectItem value="10k-50k">₹10K - ₹50K</SelectItem>
              <SelectItem value="over-50k">Over ₹50K</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Invoices</div>
              <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">
                ₹{filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Paid Amount</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Due Amount</div>
              <div className="text-2xl font-bold text-red-600">
                ₹{filteredInvoices.reduce((sum, inv) => sum + getDueAmount(inv), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="text-center py-8">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all" || amountFilter !== "all"
                  ? "No invoices match your filters."
                  : "Get started by creating your first invoice."}
              </p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => {
              const dueAmount = getDueAmount(invoice)
              return (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                          {invoice.invoiceName && (
                            <span className="text-sm text-muted-foreground">({invoice.invoiceName})</span>
                          )}
                          <Badge variant={getStatusColor(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
                          {invoice.quotationId && (
                            <Badge variant="outline" className="text-xs">
                              From Quote
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-1">{invoice.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(invoice.createdAt).toLocaleDateString()}
                          {invoice.dueDate && (
                            <span className="ml-4">Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                          )}
                        </p>
                        {invoice.paidAmount && invoice.paidAmount > 0 && (
                          <p className="text-sm text-green-600">
                            Paid: ₹{invoice.paidAmount.toLocaleString()}
                            {dueAmount > 0 && (
                              <span className="text-red-600 ml-2">Due: ₹{dueAmount.toLocaleString()}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₹{invoice.totalAmount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          SGST: ₹{(invoice.sgstAmount || invoice.gstAmount / 2).toLocaleString()} | CGST: ₹
                          {(invoice.cgstAmount || invoice.gstAmount / 2).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <Button variant="outline" size="sm" onClick={() => handleView(invoice)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDelete(invoice, e)}
                          title="Delete"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => handleDuplicate(invoice, e)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {dueAmount > 0 && (
                          <Button size="sm" onClick={() => handlePayment(invoice)}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Payment Dialog */}
      {showPayment && selectedInvoice && (
        <PaymentDialog invoice={selectedInvoice} onClose={() => setShowPayment(false)} onSubmit={handlePaymentSubmit} />
      )}
    </div>
  )
}
