"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign } from "lucide-react"
import type { Invoice } from "@/types/invoice"

interface PaymentDialogProps {
  invoice: Invoice
  onClose: () => void
  onSubmit: (paidAmount: number, paidDate: string) => void
}

export function PaymentDialog({ invoice, onClose, onSubmit }: PaymentDialogProps) {
  const [paidAmount, setPaidAmount] = useState(invoice.totalAmount)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(paidAmount, paidDate)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Mark Invoice as Paid
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input id="invoiceNumber" value={invoice.invoiceNumber} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input id="totalAmount" value={`₹${invoice.totalAmount.toLocaleString()}`} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paidAmount">Paid Amount *</Label>
            <Input
              id="paidAmount"
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number.parseFloat(e.target.value) || 0)}
              placeholder="Enter paid amount"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paidDate">Payment Date *</Label>
            <Input id="paidDate" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Mark as Paid</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
