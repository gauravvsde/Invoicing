"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { useInvoices } from "@/hooks/use-invoices"
import type { Invoice, InvoiceItem } from "@/types/invoice"

interface InvoiceFormProps {
  invoice?: Invoice | null
  onClose: () => void
}

export function InvoiceForm({ invoice, onClose }: InvoiceFormProps) {
  const { saveInvoice } = useInvoices()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Omit<Invoice, 'id' | 'items' | 'subtotal' | 'gstAmount' | 'sgstAmount' | 'cgstAmount' | 'totalAmount' | 'createdAt' | 'updatedAt' | 'paid' | 'paidDate' | 'paidAmount' | 'paymentHistory'>>(() => ({
    invoiceNumber: "",
    invoiceName: "",
    companyName: "Your Company Name",
    companyEmail: "company@example.com",
    companyPhone: "+91 9876543210",
    companyAddress: "Your Company Address",
    companyLogo: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerGSTIN: "",
    status: "draft",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: "",
  }))
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", quantity: 1, rate: 0, gstRate: 18 }])

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceName: invoice.invoiceName || "",
        companyName: invoice.companyName || "Your Company Name",
        companyEmail: invoice.companyEmail || "company@example.com",
        companyPhone: invoice.companyPhone || "+91 9876543210",
        companyAddress: invoice.companyAddress || "Your Company Address",
        companyLogo: invoice.companyLogo || "",
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        customerPhone: invoice.customerPhone,
        customerAddress: invoice.customerAddress,
        customerGSTIN: invoice.customerGSTIN || "",
        status: invoice.status,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
      });
      setItems(invoice.items);
    } else {
      // Generate new invoice number
      const now = new Date()
      const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, "0")}`

      // Set default due date to 30 days from now
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      setFormData((prev) => ({
        ...prev,
        invoiceNumber,
        dueDate: dueDate.toISOString().split("T")[0],
      }))
    }
  }, [invoice])

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
      gstRate: 18,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateSubtotal = (): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateGSTAmount = (): number => {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.rate;
      return sum + (itemTotal * (item.gstRate || 0)) / 100;
    }, 0);
  };

  const calculateSGSTAmount = (): number => {
    return calculateGSTAmount() / 2; // 50% of total GST is SGST
  };

  const calculateCGSTAmount = () => {
    return calculateGSTAmount() / 2; // Split GST equally between SGST and CGST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGSTAmount();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const now = new Date().toISOString();
      const subtotal = calculateSubtotal();
      const gstAmount = calculateGSTAmount();
      const sgstAmount = calculateSGSTAmount();
      const cgstAmount = calculateCGSTAmount();
      const totalAmount = calculateTotal();
      
      // Create base invoice data with all required fields
      const baseInvoiceData = {
        ...formData,
        items,
        subtotal,
        gstAmount,
        sgstAmount,
        cgstAmount,
        totalAmount,
        paid: false,
        paidAmount: 0,
        paidDate: '',
        paymentHistory: [],
        updatedAt: now,
      };

      if (invoice) {
        // For update, include the id and updatedAt
        await saveInvoice({
          ...baseInvoiceData,
          id: invoice.id,
          updatedAt: now,
          createdAt: invoice.createdAt, // Preserve original createdAt
        } as Invoice);
      } else {
        // For create, include createdAt
        await saveInvoice({
          ...baseInvoiceData,
          createdAt: now,
        } as Omit<Invoice, 'id'>);
      }
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Handle error (e.g., show error message to user)
    } finally {
      setSaving(false);
    }
  }

  const calculateGSTRate = () => {
    if (items.length === 0) return 0;
    const rates = items.map(item => item.gstRate).filter(rate => rate > 0);
    if (rates.length === 0) return 0;
    // This is a simplification. In a real scenario, you might have multiple GST rates.
    // Here we just take the first non-zero rate as the representative rate.
    return rates[0];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-heading text-foreground">
                  {invoice ? "Edit Invoice" : "New Invoice"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {invoice ? `Invoice #${invoice.invoiceNumber}` : 'Create a new invoice'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} form="invoice-form">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {invoice ? 'Update Invoice' : 'Create Invoice'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <form id="invoice-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerGSTIN">GSTIN</Label>
                    <Input
                      id="customerGSTIN"
                      value={formData.customerGSTIN}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerGSTIN: e.target.value }))}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerAddress">Billing Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerAddress: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Items</CardTitle>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Item {index + 1}</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Rate (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>GST (%)</Label>
                        <Select
                          value={item.gstRate.toString()}
                          onValueChange={(value) => updateItem(item.id, 'gstRate', parseFloat(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="GST" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-sm text-muted-foreground">
                        Amount: ₹{(item.quantity * item.rate).toFixed(2)} + GST: ₹{((item.quantity * item.rate * item.gstRate) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes or payment terms"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Column */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({calculateGSTRate()}%)</span>
                    <span>₹{calculateGSTAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>SGST ({calculateGSTRate() / 2}%)</span>
                    <span>₹{calculateSGSTAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>CGST ({calculateGSTRate() / 2}%)</span>
                    <span>₹{calculateCGSTAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}
