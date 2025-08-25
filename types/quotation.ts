export interface QuotationItem {
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

export interface Quotation {
  id: string
  quotationNumber: string
  quotationName: string
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  companyLogo?: string
  companyGSTIN?: string
  companyPAN?: string
  companyVendorCode?: string
  bankDetails?: BankDetails
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerGSTIN?: string
  status: "draft" | "sent" | "approved" | "rejected"
  validUntil: string
  reference?: string
  notes: string
  items: QuotationItem[]
  subtotal: number
  gstAmount: number
  sgstAmount: number
  cgstAmount: number
  roundOff?: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  totalInvoices?: number
  countryOfSupply?: string;
  placeOfSupply?: string;
}
