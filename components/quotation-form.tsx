"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Save, Download } from "lucide-react"
import { useQuotations } from "@/hooks/use-quotations"
import { usePdfGenerator } from "@/hooks/use-pdf-generator"
import type { Quotation, QuotationItem } from "@/types/quotation"
import { useRouter } from "next/navigation"

interface QuotationFormProps {
  quotation?: Quotation | null
  onClose: () => void
}

export function QuotationForm({ quotation, onClose }: QuotationFormProps) {
  const { generateQuotationPdf } = usePdfGenerator()
  const { saveQuotation } = useQuotations()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Omit<Quotation, 'id' | 'items' | 'subtotal' | 'gstAmount' | 'sgstAmount' | 'cgstAmount' | 'totalAmount' | 'createdAt' | 'updatedAt'> & { roundOff: number }>(() => ({
    quotationNumber: "",
    quotationName: "",
    companyName: "Pratham Urja Solutions",
    companyEmail: "prathamurjasolutions@gmail.com",
    companyPhone: "+919045013044",
    companyAddress: "Lodhi puram Peepal Adda, Etah, Uttar Pradesh, India - 207001",
    companyGSTIN: "09ABHFP5659C1ZZ",
    companyPAN: "ABHFP5659C",
    companyState: "Uttar Pradesh",
    companyVendorCode: "ETAH2507263060",
    companyStateCode: "09",
    companyLogo: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerGSTIN: "",
    status: "draft",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    notes: "",
    roundOff: 0,
  }))
  const [items, setItems] = useState<QuotationItem[]>([{ id: "1", title: "", description: "", quantity: 1, rate: 0, gstRate: 18 }])

  useEffect(() => {
    if (quotation) {
      setFormData({
        quotationNumber: quotation.quotationNumber || "",
        quotationName: quotation.quotationName || "",
        companyName: quotation.companyName || "Pratham Urja Solutions",
        companyEmail: quotation.companyEmail || "prathamurjasolutions@gmail.com",
        companyPhone: quotation.companyPhone || "+919045013044",
        companyAddress: quotation.companyAddress || "Lodhi puram Peepal Adda, Etah, Uttar Pradesh, India - 207001",
        companyGSTIN: quotation.companyGSTIN || "09ABHFP5659C1ZZ",
        companyPAN: quotation.companyPAN || "ABHFP5659C",
        companyState: quotation.companyState || "Uttar Pradesh",
        companyVendorCode: quotation.companyVendorCode || "ETAH2507263060",
        companyStateCode: quotation.companyStateCode || "09",
        companyLogo: quotation.companyLogo || "",
        customerName: quotation.customerName || "",
        customerEmail: quotation.customerEmail || "",
        customerPhone: quotation.customerPhone || "",
        customerAddress: quotation.customerAddress || "",
        customerGSTIN: quotation.customerGSTIN || "",
        status: quotation.status || "draft",
        validUntil: quotation.validUntil || "",
        notes: quotation.notes || "",
        roundOff: (quotation as any).roundOff || 0,
        countryOfSupply: quotation.countryOfSupply || 'India',
        placeOfSupply: quotation.placeOfSupply || 'Uttar Pradesh',
        bankDetails: quotation.bankDetails || {
          accountName: quotation.companyName,
          accountNumber: '',
          ifsc: '',
          accountType: 'Current',
          bankName: ''
        },
        reference: quotation.reference || undefined,
      })
      setItems(quotation.items.map(item => ({
        ...item,
        title: item.title || '',
        description: item.description || '',
        hsnCode: item.hsnCode || undefined,
      })) || [{ id: "1", title: "", description: "", quantity: 1, rate: 0, gstRate: 18 }])
    } else {
      // Generate new quotation number
      const now = new Date()
      const quotationNumber = `QT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, "0")}`
      setFormData((prev) => ({ ...prev, quotationNumber, quotationName: `Quotation ${quotationNumber}` }))
    }
  }, [quotation])

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      title: "",
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

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
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

  const calculateCGSTAmount = (): number => {
    return calculateGSTAmount() / 2; // 50% of total GST is CGST
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateGSTAmount() - (formData.roundOff || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const totalAmount = calculateTotal();
      
      const quotationData: Partial<Quotation> = {
        ...formData,
        // Include the original ID if editing an existing quotation
        ...(quotation?.id && { id: quotation.id }),
        items: items.map(item => ({
          ...item,
          // Ensure all item fields are included
          id: item.id || crypto.randomUUID(),
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          gstRate: Number(item.gstRate) || 0,
          hsnCode: item.hsnCode || undefined,
        })),
        subtotal: calculateSubtotal(),
        gstAmount: calculateGSTAmount(),
        sgstAmount: calculateSGSTAmount(),
        cgstAmount: calculateCGSTAmount(),
        totalAmount: totalAmount,
        // Ensure createdAt is only set for new quotations
        ...(!quotation?.id && { createdAt: now }),
        updatedAt: now,
        // Ensure validUntil is properly formatted
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
      };

      console.log('🟢 Saving quotation data:', quotationData);
      await saveQuotation(quotationData);
      // Optionally, show a success message or redirect
      alert("Quotation saved successfully!");
      onClose();
    } catch (error) {
      console.error("❌ Failed to save quotation:", error);
      // Optionally, show an error message to the user
      alert("Failed to save quotation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    console.log('🟡 [QuotationForm] Download PDF button clicked')
    console.log('🟡 [QuotationForm] Current form data:', formData);
    e.preventDefault()
    
    if (isSaving) {
      console.log('🟡 [QuotationForm] Already saving, ignoring click');
      return;
    }
    
    if (!formData.quotationNumber) {
      console.error('❌ [QuotationForm] Cannot generate PDF: No quotation number');
      alert('Please enter a quotation number before generating PDF');
      return;
    }
    
    setIsSaving(true);
    console.log('🟡 [QuotationForm] Starting PDF generation...');
    try {
      const quotationData: Quotation = {
        ...formData,
        items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGSTAmount(),
        sgstAmount: calculateGSTAmount() / 2,
        cgstAmount: calculateGSTAmount() / 2,
        roundOff: formData.roundOff || 0,
        totalAmount: calculateTotal(),
        id: quotation?.id || '',
        createdAt: quotation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        countryOfSupply: formData.countryOfSupply || 'India',
        placeOfSupply: formData.placeOfSupply || 'Uttar Pradesh',
        bankDetails: formData.bankDetails || {
          accountName: formData.companyName,
          accountNumber: '',
          ifsc: '',
          accountType: 'Current',
          bankName: ''
        },
        reference: formData.reference || undefined,
        companyGSTIN: formData.companyGSTIN || undefined,
        companyPAN: formData.companyPAN || undefined,
        customerGSTIN: formData.customerGSTIN || undefined,
        status: formData.status as 'draft' | 'sent' | 'approved' | 'rejected',
        validUntil: formData.validUntil,
        notes: formData.notes || '',
      };
      
      console.log('🟡 [QuotationForm] Generating PDF for:', {
        quotationNumber: quotationData.quotationNumber,
        itemsCount: quotationData.items.length,
        total: quotationData.totalAmount
      });
      
      console.log('🟡 [QuotationForm] Calling generateQuotationPdf with data:', {
        itemsCount: quotationData.items.length,
        total: quotationData.totalAmount,
        quotationNumber: quotationData.quotationNumber
      });
      
      const result = await generateQuotationPdf(quotationData);
      console.log('🟢 [QuotationForm] PDF generation result:', result);
      
      if (!result) {
        throw new Error('Failed to generate PDF: No result returned');
      }
    } catch (error) {
      console.error('❌ [QuotationForm] Error generating PDF:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
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
                <h1 className="text-2xl font-bold font-heading text-foreground">
                  {quotation ? "Edit Quotation" : "New Quotation"}
                </h1>
                <p className="text-sm text-muted-foreground">{formData.quotationNumber}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Quotation"}
              </Button>
              {/* Removed Download PDF button - now available in QuotationView */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyEmail: e.target.value }))}
                      placeholder="company@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyPhone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyLogo">Company Logo URL</Label>
                    <Input
                      id="companyLogo"
                      value={formData.companyLogo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyLogo: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyAddress: e.target.value }))}
                    placeholder="Enter company address"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

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
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerAddress">Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerAddress: e.target.value }))}
                    placeholder="Enter customer address"
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
                  <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {items.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label>Item Title *</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, "title", e.target.value)}
                          placeholder="Enter item title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Enter item description (optional)"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Rate (₹) *</Label>
                        <Input
                          type="text"
                          value={item.rate || ""} // Ensure rate always has a defined value
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, "")
                            updateItem(item.id, "rate", Number.parseFloat(value) || 0)
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>GST Rate (%)</Label>
                        <Select
                          value={item.gstRate.toString()}
                          onValueChange={(value) => updateItem(item.id, "gstRate", Number.parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Amount: ₹{(item.quantity * item.rate).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SGST ({item.gstRate / 2}%): ₹
                        {((item.quantity * item.rate * item.gstRate) / 200).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CGST ({item.gstRate / 2}%): ₹
                        {((item.quantity * item.rate * item.gstRate) / 200).toLocaleString()}
                      </p>
                      <p className="font-medium">
                        Total: ₹{(item.quantity * item.rate * (1 + item.gstRate / 100)).toLocaleString()}
                      </p>
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
                  placeholder="Enter any additional notes or terms"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quotation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quotationName">Quotation Name</Label>
                  <Input
                    id="quotationName"
                    value={formData.quotationName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quotationName: e.target.value }))}
                    placeholder="Enter quotation name"
                  />
                </div>
                <div>
                  <Label htmlFor="quotationNumber">Quotation Number</Label>
                  <Input
                    id="quotationNumber"
                    value={formData.quotationNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quotationNumber: e.target.value }))}
                    placeholder="Enter quotation number"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-8 w-full">
                  <Card className="bg-card/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pt-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">GST</span>
                            <span className="font-medium">₹{calculateGSTAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground  mt-0.5">
                            <span>SGST</span>
                            <span>₹{calculateSGSTAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground  mt-0.5">
                            <span>CGST</span>
                            <span>₹{calculateCGSTAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-sm text-muted-foreground">Round Off</span>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mr-2">-</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24 h-8 text-right text-sm"
                              value={formData.roundOff || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow decimal numbers with up to 2 decimal places
                                if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    roundOff: value === '' ? 0 : parseFloat(value)
                                  }));
                                }
                              }}
                              onBlur={(e) => {
                                // Format to 2 decimal places on blur
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    roundOff: parseFloat(value.toFixed(2))
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between pt-2 mt-2 border-t border-border">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-base">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
