"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, UserPlus, X } from "lucide-react"
import { useGST } from "@/hooks/use-gst"
import { useDealers } from "@/hooks/use-dealers"
import type { GSTRecord } from "@/types/gst"
import type { Dealer } from "@/types/dealer"

interface GSTRecordFormProps {
  onSuccess?: (record: GSTRecord) => void
  onCancel: () => void
  initialData?: Partial<GSTRecord>
}

export function GSTRecordForm({ onSuccess, onCancel, initialData = {} }: GSTRecordFormProps) {
  const { addGSTRecord } = useGST()
  const { dealers = [], addDealer, loading: dealersLoading, error: dealersError } = useDealers()
  const [isAddingDealer, setIsAddingDealer] = useState(false)
  const [newDealer, setNewDealer] = useState({
    name: "",
    gstin: "",
    address: "",
    phone: "",
    email: ""
  })
  
  const [formData, setFormData] = useState({
    type: initialData.type || "paid" as const,
    amount: initialData.amount || 0,
    gstAmount: initialData.gstAmount || 0,
    dealerId: initialData.dealerId || "",
    description: initialData.description || "",
    date: initialData.date || new Date().toISOString().split("T")[0],
  })

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dealerData = {
        name: newDealer.name,
        gstin: newDealer.gstin || undefined,
        address: newDealer.address || undefined,
        phone: newDealer.phone || undefined,
        email: newDealer.email || undefined
      }
      await addDealer(dealerData)
      setIsAddingDealer(false)
      setNewDealer({
        name: "",
        gstin: "",
        address: "",
        phone: "",
        email: ""
      })
    } catch (error) {
      console.error("Error adding dealer:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const date = new Date(formData.date)
    const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`
    const quarter = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`
    const year = date.getFullYear().toString()
    
    const selectedDealer = dealers.find(d => d.id === formData.dealerId)

    const record: Omit<GSTRecord, "id" | 'createdAt' | 'updatedAt'> = {
      type: formData.type,
      amount: formData.amount,
      gstAmount: formData.gstAmount,
      description: formData.description,
      date: formData.date,
      month,
      quarter,
      year,
      status: 'unfiled',
      paymentStatus: formData.type === 'paid' ? 'paid' : 'pending',
      dealerId: selectedDealer?.id || undefined,
      customerName: selectedDealer?.name || undefined,
      customerGSTIN: selectedDealer?.gstin || undefined
    }

    try {
      const result = await addGSTRecord(record)
      if (onSuccess && result) {
        onSuccess({ ...record, id: result.id } as GSTRecord)
      }
    } catch (error) {
      console.error("Error saving GST record:", error)
    }
  }

  if (isAddingDealer) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Add New Dealer</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsAddingDealer(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleAddDealer} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dealerName">Dealer Name *</Label>
            <Input
              id="dealerName"
              value={newDealer.name}
              onChange={(e) => setNewDealer(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter dealer name"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={newDealer.gstin}
                onChange={(e) => setNewDealer(prev => ({ ...prev, gstin: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={newDealer.phone}
                onChange={(e) => setNewDealer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newDealer.email}
              onChange={(e) => setNewDealer(prev => ({ ...prev, email: e.target.value }))}
              placeholder="dealer@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={newDealer.address}
              onChange={(e) => setNewDealer(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter full address"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddingDealer(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Dealer
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
<div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value: 'paid' | 'collected') => setFormData(prev => ({ ...prev, type: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="collected">GST Collected (Output Tax)</SelectItem>
            <SelectItem value="paid">GST Paid (Input Tax Credit)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <Label htmlFor="dealer">Dealer</Label>
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-50 border-blue-500 text-blue-600 hover:text-blue-700"
            onClick={() => {
              console.log('New Dealer button clicked');
              setIsAddingDealer(true);
            }}
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            New Dealer
          </Button>
        </div>
        <Select
          value={formData.dealerId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, dealerId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a dealer" />
          </SelectTrigger>
          <SelectContent>
            {dealers.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.name} {dealer.gstin ? `(${dealer.gstin})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹) *</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={formData.amount || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            amount: Number.parseFloat(e.target.value) || 0 
          }))}
          placeholder="Enter base amount"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="gstAmount">GST Amount (₹) *</Label>
        <Input
          id="gstAmount"
          type="number"
          min="0"
          step="0.01"
          value={formData.gstAmount || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            gstAmount: Number.parseFloat(e.target.value) || 0 
          }))}
          placeholder="Enter GST amount"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter description or notes"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Plus className="mr-2 h-4 w-4" />
          Save Record
        </Button>
      </div>
      </form>
    </>
  )
}