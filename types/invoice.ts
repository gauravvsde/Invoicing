export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  gstRate: number
  hsnCode?: string
  sgstAmount?: number
  cgstAmount?: number
}

export interface BankDetails {
  accountName: string
  accountNumber: string
  ifsc: string
  accountType: string
  bankName: string
  branch?: string
}

export interface PaymentRecord {
  id: string
  amount: number
  date: string
  method: string
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceName: string
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  companyLogo?: string
  companyGSTIN?: string
  companyPAN?: string
  companyVendorCode?: string
  bankDetails?: BankDetails
  quotationId?: string // Reference to original quotation if converted
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerGSTIN?: string
  paid?: boolean // For backward compatibility with GST calculations
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partially_paid"
  dueDate: string
  paidDate?: string
  paidAmount?: number
  paymentHistory?: PaymentRecord[]
  notes: string
  items: InvoiceItem[]
  subtotal: number
  gstAmount: number
  sgstAmount: number
  cgstAmount: number
  roundOff?: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}
