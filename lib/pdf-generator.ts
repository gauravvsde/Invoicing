import jsPDF from "jspdf"
import type { Quotation } from "@/types/quotation"
import type { Invoice } from "@/types/invoice"
import type { GSTSummary } from "@/types/gst"

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number

  constructor() {
    this.doc = new jsPDF()
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 15
  }

  private addEstimateHeader(
    quotationNumber: string,
    quotationDate: string,
    validTillDate: string,
    companyDetails: {
      name: string
      address: string
      gstin?: string
      pan?: string
      email: string
      phone: string
      vendorCode?: string
    },
  ) {
    // Title "Estimate"
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Estimate", this.margin, 25)

    // Quotation details table
    const detailsStartY = 35
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")

    // Create a simple table for quotation details
    const details = [
      ["Quotation No", `#${quotationNumber}`],
      ["Quotation Date", new Date(quotationDate).toLocaleDateString("en-GB")],
      ["Valid Till Date", new Date(validTillDate).toLocaleDateString("en-GB")],
    ]

    let currentY = detailsStartY
    details.forEach(([label, value]) => {
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, this.margin, currentY)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, this.margin + 50, currentY)
      currentY += 8
    })

    return currentY + 10
  }

  private addCompanyAndCustomerDetails(
    companyDetails: {
      name: string
      address: string
      gstin?: string
      pan?: string
      email: string
      phone: string
      vendorCode?: string
    },
    customerDetails: {
      name: string
      address?: string
      phone?: string
    },
    startY: number,
  ) {
    const midPoint = this.pageWidth / 2

    // Quotation From (Company Details)
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Quotation From", this.margin, startY)

    // Set company details with the exact format requested
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Pratham Urja Solutions", this.margin, startY + 10)

    this.doc.setFont("helvetica", "normal")
    let currentY = startY + 18

    // Company address - formatted as requested
    const addressLines = [
      "Lodhi puram Peepal Adda,",
      "Etah,",
      "Uttar Pradesh, India - 207001"
    ]
    
    addressLines.forEach((line) => {
      this.doc.text(line, this.margin, currentY)
      currentY += 6
    })

    // Company details - formatted as requested
    this.doc.text("GSTIN: 09ABHFP5659C1ZZ", this.margin, currentY)
    currentY += 6
    this.doc.text("PAN: ABHFP5659C", this.margin, currentY)
    currentY += 6
    this.doc.text("Email: prathamurjasolutions@gmail.com", this.margin, currentY)
    currentY += 6
    this.doc.text("Phone: +919045013044", this.margin, currentY)
    currentY += 6
    this.doc.text("UPNEDA Vendor Code: ETAH2507263060", this.margin, currentY)
    currentY += 6

    // Quotation For (Customer Details)
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Quotation For", midPoint, startY)

    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(customerDetails.name, midPoint, startY + 10)

    this.doc.setFont("helvetica", "normal")
    let customerY = startY + 18

    if (customerDetails.address) {
      const customerAddressLines = customerDetails.address.split("\n")
      customerAddressLines.forEach((line) => {
        this.doc.text(line, midPoint, customerY)
        customerY += 6
      })
    }

    if (customerDetails.phone) {
      this.doc.text(`Phone: ${customerDetails.phone}`, midPoint, customerY)
      customerY += 6
    }

    // Country and Place of Supply
    this.doc.text("Country of Supply: India", midPoint, customerY)
    customerY += 6
    this.doc.text("Place of Supply: Uttar Pradesh (09)", midPoint, customerY)

    return Math.max(currentY, customerY) + 15
  }

  private addItemsTableNew(
    items: Array<{
      description: string
      quantity: number
      rate: number
      gstRate: number
      hsnCode?: string
    }>,
    startY: number,
  ) {
    // Table headers
    const headers = ["Item", "Quantity", "Rate", "GST Rate", "Amount", "CGST", "SGST", "Total"]
    const colWidths = [45, 20, 25, 20, 25, 20, 20, 25]

    // Header background
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(this.margin, startY - 5, this.pageWidth - 2 * this.margin, 12, "F")

    // Header text
    this.doc.setFontSize(9)
    this.doc.setFont("helvetica", "bold")

    let currentX = this.margin + 2
    headers.forEach((header, index) => {
      this.doc.text(header, currentX, startY + 2)
      currentX += colWidths[index]
    })

    // Header border
    this.doc.setLineWidth(0.5)
    this.doc.rect(this.margin, startY - 5, this.pageWidth - 2 * this.margin, 12)

    let currentY = startY + 15

    // Items
    items.forEach((item, index) => {
      const amount = item.quantity * item.rate
      const cgstAmount = (amount * item.gstRate) / 200
      const sgstAmount = (amount * item.gstRate) / 200
      const totalAmount = amount + cgstAmount + sgstAmount

      // Row background (alternating)
      if (index % 2 === 1) {
        this.doc.setFillColor(250, 250, 250)
        this.doc.rect(this.margin, currentY - 8, this.pageWidth - 2 * this.margin, 16, "F")
      }

      this.doc.setFontSize(8)
      this.doc.setFont("helvetica", "normal")

      currentX = this.margin + 2

      // Item description with HSN code
      const itemText = item.hsnCode ? `${item.description} (HSN/SAC: ${item.hsnCode})` : item.description
      const itemLines = this.doc.splitTextToSize(itemText, colWidths[0] - 4)
      this.doc.text(itemLines[0] || "", currentX, currentY)
      if (itemLines[1]) {
        this.doc.text(itemLines[1], currentX, currentY + 6)
      }
      currentX += colWidths[0]

      // Quantity
      this.doc.text(`${item.quantity} (unt)`, currentX, currentY)
      currentX += colWidths[1]

      // Rate
      this.doc.text(`₹${item.rate.toLocaleString()}`, currentX, currentY)
      currentX += colWidths[2]

      // GST Rate
      this.doc.text(`${item.gstRate}%`, currentX, currentY)
      currentX += colWidths[3]

      // Amount
      this.doc.text(`₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, currentX, currentY)
      currentX += colWidths[4]

      // CGST
      this.doc.text(`₹${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, currentX, currentY)
      currentX += colWidths[5]

      // SGST
      this.doc.text(`₹${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, currentX, currentY)
      currentX += colWidths[6]

      // Total
      this.doc.text(`₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, currentX, currentY)

      currentY += 16
    })

    // Table border
    this.doc.rect(this.margin, startY - 5, this.pageWidth - 2 * this.margin, currentY - startY + 5)

    return currentY + 10
  }

  private addBankDetails(
    bankDetails: {
      accountName: string
      accountNumber: string
      ifsc: string
      accountType: string
      bankName: string
    },
    startY: number,
  ) {
    const boxWidth = this.pageWidth - (this.margin * 2) - 20
    const boxHeight = 60
    const boxX = this.margin + 5
    const boxY = startY + 5
    
    // Draw solid light blue background
    this.doc.setFillColor(240, 248, 255)
    this.doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F')
    
    // Add border
    this.doc.setDrawColor(180, 210, 255)
    this.doc.setLineWidth(0.5)
    this.doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3)
    
    // Add bank icon (using a simple text icon as placeholder)
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(0, 51, 153)
    this.doc.text("🏦", boxX + 10, boxY + 15)
    
    // Add bank name and account type in a column on the left
    const leftColumnX = boxX + 30
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(bankDetails.bankName, leftColumnX, boxY + 15)
    
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(bankDetails.accountType, leftColumnX, boxY + 22)
    
    // Add account number
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(0, 0, 0)
    this.doc.text("Account No.", leftColumnX, boxY + 35)
    this.doc.text(bankDetails.accountNumber, leftColumnX + 30, boxY + 35)
    
    // Add vertical divider
    const dividerX = boxX + boxWidth / 2.5
    this.doc.setDrawColor(200, 220, 255)
    this.doc.setLineWidth(0.5)
    this.doc.line(dividerX, boxY + 10, dividerX, boxY + boxHeight - 10)
    
    // Add right column details
    const rightColumnX = dividerX + 10
    
    // Add IFSC
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("IFSC:", rightColumnX, boxY + 15)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(bankDetails.ifsc, rightColumnX + 15, boxY + 15)
    
    // Add beneficiary name
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Beneficiary:", rightColumnX, boxY + 35)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(bankDetails.accountName, rightColumnX + 25, boxY + 35)
    
    // Add decorative bottom border
    this.doc.setDrawColor(200, 220, 255)
    this.doc.setLineWidth(0.5)
    this.doc.line(boxX + 10, boxY + boxHeight - 10, boxX + boxWidth - 10, boxY + boxHeight - 10)
    
    // Add bank transfer details text at bottom
    this.doc.setFontSize(8)
    this.doc.setFont("helvetica", "normal")
    this.doc.setTextColor(120, 120, 120)
    this.doc.text("Bank Transfer Details", boxX + 10, boxY + boxHeight - 2)
    
    return startY + boxHeight + 15
  }

  private addTotalsSummary(
    totals: {
      subtotal: number
      cgstAmount: number
      sgstAmount: number
      roundOff?: number
      totalAmount: number
    },
    startY: number,
  ) {
    const rightX = this.pageWidth - this.margin - 60
    const labelX = rightX - 40

    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")

    let currentY = startY

    // Amount
    this.doc.text("Amount", labelX, currentY)
    this.doc.text(`₹${totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX, currentY, {
      align: "right",
    })
    currentY += 8

    // CGST
    this.doc.text("CGST", labelX, currentY)
    this.doc.text(`₹${totals.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX, currentY, {
      align: "right",
    })
    currentY += 8

    // SGST
    this.doc.text("SGST", labelX, currentY)
    this.doc.text(`₹${totals.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX, currentY, {
      align: "right",
    })
    currentY += 8

    // Round off (if any)
    if (totals.roundOff !== undefined && Math.abs(totals.roundOff) > 0.01) {
      this.doc.text("Round Off", labelX, currentY)
      const roundOffText = totals.roundOff > 0
        ? `₹${totals.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `(₹${Math.abs(totals.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      this.doc.text(roundOffText, rightX, currentY, { align: "right" })
      currentY += 8
    }

    // Total line
    this.doc.setLineWidth(0.5)
    this.doc.line(labelX, currentY, rightX + 60, currentY)
    currentY += 10

    // Total
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(12)
    this.doc.text("Total (INR)", labelX, currentY)
    this.doc.text(
      `₹${totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rightX,
      currentY,
      { align: "right" }
    )

    // Draw box around totals
    const boxHeight = currentY - startY + 15
    this.doc.rect(labelX - 5, startY - 5, rightX - labelX + 65, boxHeight)

    return currentY + 20
  }

  generateQuotationPDF(quotation: Quotation): void {
    // Header with quotation details
    let currentY = this.addEstimateHeader(
      quotation.quotationNumber,
      quotation.createdAt,
      quotation.validUntil || quotation.createdAt,
      {
        name: "Pratham Urja Solutions",
        address: "Lodhi puram Peepal Adda,\nEtah,\nUttar Pradesh, India - 207001",
        gstin: "09ABHFP5659C1ZZ",
        pan: "ABHFP5659C",
        email: "prathamurjasolutions@gmail.com",
        phone: "+919045013044",
        vendorCode: "ETAH2507263060"
      }
    )

    // Company and customer details
    currentY = this.addCompanyAndCustomerDetails(
      {
        name: quotation.companyName || "Your Company Name",
        address: quotation.companyAddress || "Your Company Address",
        gstin: quotation.companyGSTIN,
        pan: quotation.companyPAN,
        email: quotation.companyEmail || "email@company.com",
        phone: quotation.companyPhone || "+91XXXXXXXXXX",
        vendorCode: quotation.companyVendorCode,
      },
      {
        name: quotation.customerName,
        address: quotation.customerAddress,
        phone: quotation.customerPhone,
      },
      currentY,
    )

    // Items table
    currentY = this.addItemsTableNew(
      quotation.items.map((item) => ({
        ...item,
        hsnCode: item.hsnCode || "8542",
      })),
      currentY,
    )

    // Bank details (with defaults if not provided)
    const bankDetails = quotation.bankDetails || {
      accountName: 'PRATHAM URJA SOLUTIONS',
      accountNumber: '50200074654534',
      ifsc: 'HDFC0000001',
      accountType: 'Current Account',
      bankName: 'HDFC Bank',
    }
    currentY = this.addBankDetails(bankDetails, currentY)

    // Totals summary
    currentY = this.addTotalsSummary(
      {
        subtotal: quotation.subtotal,
        cgstAmount: quotation.cgstAmount || quotation.gstAmount / 2,
        sgstAmount: quotation.sgstAmount || quotation.gstAmount / 2,
        roundOff: quotation.roundOff,
        totalAmount: quotation.totalAmount,
      },
      currentY,
    )

    // Terms and conditions
    const defaultTerms = [
      "Amount once paid will not be refund back in any circumstances.",
      "Warranties of products will be given by their respective manufacturers.",
      "For any disputes, jurisdiction will be Etah only.",
    ]
    this.addTermsAndConditions(defaultTerms, currentY)

    // Download
    this.doc.save(`quotation-${quotation.quotationNumber}.pdf`)
  }

  private addTermsAndConditions(terms: string[], startY: number): number {
    this.doc.setFontSize(9)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Terms and Conditions:", this.margin, startY)
    
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(8)
    
    let y = startY + 5
    const maxWidth = this.pageWidth - (this.margin * 2) - 5
    
    terms.forEach((term, index) => {
      const bullet = `${index + 1}. `
      const bulletWidth = this.doc.getTextWidth(bullet)
      
      // Split long text into multiple lines if needed
      const wrappedText = this.doc.splitTextToSize(term, maxWidth - bulletWidth)
      
      // Add first line with bullet
      this.doc.text(bullet + wrappedText[0], this.margin + 5, y + 3)
      
      // Add remaining lines indented
      if (wrappedText.length > 1) {
        for (let i = 1; i < wrappedText.length; i++) {
          y += 4
          this.doc.text(wrappedText[i], this.margin + 5 + bulletWidth, y + 3)
        }
      }
      
      y += 6 // Add more space between items
    })
    
    return y + 10
  }

  generateInvoicePDF(invoice: Invoice): void {
    // Similar structure but with "Invoice" title
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Invoice", this.margin, 25)

    // Invoice details
    const detailsStartY = 35
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")

    const details = [
      ["Invoice No", `#${invoice.invoiceNumber}`],
      ["Invoice Date", new Date(invoice.createdAt).toLocaleDateString("en-GB")],
      ["Due Date", new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString("en-GB")],
    ]

    let currentY = detailsStartY
    details.forEach(([label, value]) => {
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, this.margin, currentY)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, this.margin + 50, currentY)
      currentY += 8
    })

    currentY += 10

    // Company and customer details
    currentY = this.addCompanyAndCustomerDetails(
      {
        name: invoice.companyName || "Your Company Name",
        address: invoice.companyAddress || "Your Company Address",
        gstin: invoice.companyGSTIN,
        pan: invoice.companyPAN,
        email: invoice.companyEmail || "email@company.com",
        phone: invoice.companyPhone || "+91XXXXXXXXXX",
        vendorCode: invoice.companyVendorCode,
      },
      {
        name: invoice.customerName,
        address: invoice.customerAddress,
        phone: invoice.customerPhone,
      },
      currentY,
    )

    // Items table
    currentY = this.addItemsTableNew(
      invoice.items.map((item) => ({
        ...item,
        hsnCode: item.hsnCode || "8542",
      })),
      currentY,
    )

    // Payment information (if applicable)
    if (invoice.paidAmount && invoice.paidAmount > 0) {
      this.doc.setFontSize(12)
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Payment Information", this.margin, currentY)

      this.doc.setFontSize(10)
      this.doc.setFont("helvetica", "normal")
      currentY += 10

      this.doc.text(
        `Paid Amount: ₹${invoice.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        this.margin,
        currentY,
      )
      currentY += 8

      const dueAmount = invoice.totalAmount - invoice.paidAmount
      if (dueAmount > 0) {
        this.doc.setTextColor(255, 0, 0)
        this.doc.text(
          `Due Amount: ₹${dueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
          this.margin,
          currentY,
        )
        this.doc.setTextColor(0, 0, 0)
        currentY += 8
      }

      // Payment history
      if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
        this.doc.text("Payment History:", this.margin, currentY)
        currentY += 8

        invoice.paymentHistory.forEach((payment) => {
          this.doc.text(
            `${new Date(payment.date).toLocaleDateString("en-GB")}: ₹${payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            this.margin + 10,
            currentY,
          )
          currentY += 6
        })
      }
      currentY += 10
    }

    // Bank details (if available)
    if (invoice.bankDetails) {
      currentY = this.addBankDetails(invoice.bankDetails, currentY)
    }

    // Totals summary
    currentY = this.addTotalsSummary(
      {
        subtotal: invoice.subtotal,
        cgstAmount: invoice.cgstAmount || invoice.gstAmount / 2,
        sgstAmount: invoice.sgstAmount || invoice.gstAmount / 2,
        roundOff: invoice.roundOff,
        totalAmount: invoice.totalAmount,
      },
      currentY,
    )

    // Terms and conditions
    const defaultTerms = [
      "Amount once paid will not be refund back in any circumstances.",
      "Warranties of products will be given by their respective manufacturers.",
      "For any disputes, jurisdiction will be Etah only.",
    ]
    this.addTermsAndConditions(defaultTerms, currentY)

    // Download
    this.doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
  }

  generateGSTReportPDF(summaries: GSTSummary[], title = "GST Report"): void {
    let currentY = this.addHeader(title.toUpperCase())

    // Summary table
    const tableHeaders = ["Month", "GST Collected", "GST Paid", "Net GST", "Invoices"]
    const colWidths = [35, 35, 35, 35, 25]
    const rowHeight = 8

    // Table header
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")

    let currentX = this.margin
    tableHeaders.forEach((header, index) => {
      this.doc.text(header, currentX, currentY)
      currentX += colWidths[index]
    })

    // Header line
    this.doc.line(this.margin, currentY + 2, this.pageWidth - this.margin, currentY + 2)

    // Table rows
    this.doc.setFont("helvetica", "normal")
    currentY += 10

    let totalCollected = 0
    let totalPaid = 0
    let totalNet = 0
    let totalInvoices = 0

    summaries.forEach((summary) => {
      currentX = this.margin

      // Month
      const monthName = new Date(summary.month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
      this.doc.text(monthName, currentX, currentY)
      currentX += colWidths[0]

      // GST Collected
      this.doc.text(
        `₹${summary.gstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        currentX,
        currentY,
        { align: "right" }
      )
      currentX += colWidths[1]

      // GST Paid
      this.doc.text(
        `₹${summary.gstPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        currentX,
        currentY,
        { align: "right" }
      )
      currentX += colWidths[2]

      // Net GST
      this.doc.text(
        `₹${Math.abs(summary.netGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        currentX,
        currentY,
        { align: "right" }
      )
      currentX += colWidths[3]

      // Invoices
      const invoicesCount = summary.totalInvoices || 0
      this.doc.text(invoicesCount.toString(), currentX, currentY, { align: "right" })

      // Update totals
      totalCollected += summary.gstCollected
      totalPaid += summary.gstPaid
      totalNet += summary.netGST
      totalInvoices += invoicesCount

      currentY += rowHeight
    })

    // Total row
    currentY += 5
    this.doc.line(this.margin, currentY, this.pageWidth - this.margin, currentY)
    currentY += 8

    this.doc.setFont("helvetica", "bold")
    currentX = this.margin

    this.doc.text("TOTAL", currentX, currentY)
    currentX += colWidths[0]

    this.doc.text(`₹${totalCollected.toLocaleString()}`, currentX, currentY, { align: "right" })
    currentX += colWidths[1]

    this.doc.text(`₹${totalPaid.toLocaleString()}`, currentX, currentY, { align: "right" })
    currentX += colWidths[2]

    this.doc.text(`₹${Math.abs(totalNet).toLocaleString()}`, currentX, currentY, { align: "right" })
    currentX += colWidths[3]

    this.doc.text(totalInvoices.toString(), currentX, currentY, { align: "right" })

    // Download
    this.doc.save(`gst-report-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  private addHeader(title: string) {
    this.doc.setFontSize(16)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(title, this.pageWidth / 2, 25, { align: "center" })

    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, 35, this.pageWidth - this.margin, 35)

    return 50
  }
}
