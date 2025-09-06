export interface GSTRecord {
  id: string
  type: "collected" | "paid"
  amount: number
  gstRate?: number
  gstAmount?: number
  description: string
  status: "unfiled" | "filed"
  paymentStatus: "pending" | "paid"
  invoiceId?: string
  quotationId?: string
  dealerId?: string
  date: string
  month: string // YYYY-MM format
  quarter: string // YYYY-Q1, YYYY-Q2, etc.
  year: string
  customerName?: string
  customerGSTIN?: string
  createdAt?: string
  updatedAt?: string
  _createdBy?: string
}

export interface GSTSummary {
  month: string // YYYY-MM format
  gstCollected: number
  gstPaid: number
  netGST: number
  totalInvoices?: number
}

export interface GSTReturn {
  id: string
  period: string // YYYY-MM or YYYY-Q1 format
  type: 'monthly' | 'quarterly'
  dueDate: string
  netGST: number
  records: string[] // Array of GSTRecord IDs
  totalGST: number
  status: "draft" | "filed" | "paid"
  filedAt?: string
  createdAt?: string
  updatedAt?: string
}
