"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Edit, Eye, FileText, ArrowRight, ArrowLeft, Copy, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Quotation } from "@/types/quotation"

// Dynamically import client-side components with SSR disabled
const QuotationForm = dynamic(
  () => import('@/components/quotation-form').then(mod => mod.QuotationForm),
  { ssr: false, loading: () => <div>Loading form...</div> }
)

const QuotationView = dynamic(
  () => import('@/components/quotation-view').then(mod => mod.QuotationView),
  { ssr: false, loading: () => <div>Loading view...</div> }
)

// Define the Quotation type for the component
type QuotationWithId = Quotation & { id: string }

// Import hooks at the top level
import { useQuotations } from "@/hooks/use-quotations"
import { useInvoices } from "@/hooks/use-invoices"

// Create a wrapper component that will handle the hooks
function QuotationsClient() {
  const router = useRouter()
  
  // Initialize hooks at the top level
  const { 
    quotations: rawQuotations = [], 
    loading: quotationsLoading, 
    duplicateQuotation,
    deleteQuotation,
    error: quotationsError 
  } = useQuotations()
  
  const { 
    createInvoiceFromQuotation 
  } = useInvoices()
  
  // Local state
  const [quotations, setQuotations] = useState<QuotationWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithId | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Sync quotations from hook
  useEffect(() => {
    if (!quotationsLoading && rawQuotations) {
      setQuotations(rawQuotations as QuotationWithId[])
      setLoading(false)
    }
  }, [quotationsLoading, rawQuotations])

  const filteredQuotations = useCallback(() => {
    if (!quotations) return [];
    return quotations.filter((quote: QuotationWithId) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        (quote.customerName?.toLowerCase().includes(searchLower) ||
        quote.quotationNumber?.toLowerCase().includes(searchLower) ||
        (quote.quotationName && quote.quotationName.toLowerCase().includes(searchLower)))
      )
    })
  }, [quotations, searchTerm])

  const handleEdit = useCallback((quotation: QuotationWithId) => {
    setSelectedQuotation(quotation)
    setShowForm(true)
  }, [])

  const handleView = useCallback((quotation: QuotationWithId) => {
    setSelectedQuotation(quotation)
    setShowView(true)
  }, [])

  const handleNew = useCallback(() => {
    setSelectedQuotation(null)
    setShowForm(true)
  }, [])

  const handleDuplicate = useCallback(async (quotation: QuotationWithId) => {
    if (!duplicateQuotation) {
      console.error('Duplicate function not available')
      return
    }
    
    try {
      const duplicatedId = await duplicateQuotation(quotation.id)
      if (duplicatedId) {
        // The useQuotations hook will automatically update the data
        // We can rely on the effect to update the local state
      }
    } catch (error) {
      console.error('Error duplicating quotation:', error)
    }
  }, [duplicateQuotation])

  const handleDelete = useCallback(async (quotation: QuotationWithId, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click event
    if (deleteQuotation) {
      try {
        await deleteQuotation(quotation.id)
        // The useQuotations hook will automatically update the data
      } catch (error) {
        console.error('Error deleting quotation:', error)
      }
    }
  }, [deleteQuotation])

  const handleCreateInvoice = useCallback(async (quotation: QuotationWithId) => {
    if (!createInvoiceFromQuotation) {
      console.error('Create invoice function not available')
      return
    }
    
    try {
      await createInvoiceFromQuotation(quotation)
      router.push("/invoices")
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  }, [createInvoiceFromQuotation, router])

  const handleClose = useCallback(() => {
    setShowForm(false)
    setShowView(false)
    setSelectedQuotation(null)
  }, [])

  if (showForm) {
    return <QuotationForm quotation={selectedQuotation} onClose={handleClose} />
  }

  if (showView && selectedQuotation) {
    return (
      <QuotationView
        quotation={selectedQuotation}
        onClose={handleClose}
        onEdit={() => handleEdit(selectedQuotation)}
        onDuplicate={() => handleDuplicate(selectedQuotation)}
        onCreateInvoice={() => handleCreateInvoice(selectedQuotation)}
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
                <h1 className="text-2xl font-bold font-heading text-foreground">Quotation Management</h1>
                <p className="text-sm text-muted-foreground">Create and manage quotations</p>
              </div>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Quotations List */}
        {loading ? (
          <div className="text-center py-8">Loading quotations...</div>
        ) : filteredQuotations().length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No quotations match your search." : "Get started by creating your first quotation."}
              </p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredQuotations().map((quotation: QuotationWithId) => (
              <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{quotation.quotationNumber}</h3>
                        {quotation.quotationName && (
                          <span className="text-sm text-muted-foreground">({quotation.quotationName})</span>
                        )}
                        <Badge
                          variant={
                            quotation.status === "draft"
                              ? "secondary"
                              : quotation.status === "sent"
                                ? "default"
                                : "outline"
                          }
                        >
                          {quotation.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-1">{quotation.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        Created: {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{quotation.totalAmount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        SGST: ₹{(quotation.sgstAmount || quotation.gstAmount / 2).toLocaleString()} | CGST: ₹
                        {(quotation.cgstAmount || quotation.gstAmount / 2).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleView(quotation)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => handleDelete(quotation, e)}
                        title="Delete"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(quotation)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(quotation)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleCreateInvoice(quotation)}>
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default QuotationsClient
