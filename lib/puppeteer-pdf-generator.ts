// import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Quotation } from '@/types/quotation';
import { Invoice } from '@/types/invoice';
import fs from 'fs';
import path from 'path';

/**
 * Expected extra fields on Quotation (all optional, fallbacks provided):
 * - validTill?: string | Date
 * - title?: string  // default: "Estimate"
 * - placeOfSupply?: string
 * - countryOfSupply?: string
 * - companyName?: string
 * - companyAddress?: string
 * - companyGSTIN?: string
 * - companyPAN?: string
 * - companyEmail?: string
 * - companyPhone?: string
 * - vendorCode?: string
 * - customerPhone?: string
 * - terms?: string[]            // for “Terms & Conditions”
 * - grandTotal?: number         // if you want to force a nice rounded figure
 *
 * items may include:
 * - subtitle?: string           // second line under description
 */
export class PuppeteerPDFGenerator {
  private formatINR(n: number): string {
    return `₹${(n ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private numberToWords(num: number): string {
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const formatTens = (num: number): string => {
      if (num < 10) return single[num];
      if (num < 20) return double[num - 10];
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + single[num % 10] : '');
    };

    if (num === 0) return 'Zero';
    
    const convert = (num: number): string => {
      if (num < 100) return formatTens(num);
      if (num < 1000) {
        return single[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + formatTens(num % 100) : '');
      }
      if (num < 100000) {
        return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      }
      if (num < 10000000) {
        return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
      }
      return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = convert(rupees) + ' Rupees';
    if (paise > 0) {
      result += ' and ' + convert(paise) + ' Paise';
    }
    return result.toUpperCase() + ' ONLY';
  }

  private esc(str?: string) {
    return (str ?? '').replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]!));
  }

  async generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
    const html = await this.getTemplate(invoice, true);
    return this.generatePDF(html);
  }

  async generateQuotationPDF(quotation: Quotation): Promise<Buffer> {
    const html = await this.getTemplate(quotation, false);
    return this.generatePDF(html);
  }

  private async getTemplate(document: Quotation | Invoice, isInvoice: boolean): Promise<string> {
    const primary = '#6F42C1';        // purple
    const primaryLight = '#F4EEFF';   // light purple panel
    const textMuted = '#6b7280';

    const docNumber = isInvoice 
      ? (document as Invoice).invoiceNumber 
      : (document as Quotation).quotationNumber;
    const docDate = isInvoice && (document as Invoice).invoiceDate 
      ? new Date((document as Invoice).invoiceDate) 
      : document.createdAt 
        ? new Date(document.createdAt) 
        : new Date();
    const validTill = !isInvoice && (document as Quotation).validUntil 
      ? new Date((document as Quotation).validUntil) 
      : undefined;
      
    // Type-safe document access
    const doc = document as any; // Using 'any' to access dynamic properties

    // Document type specific text
    const docType = isInvoice ? 'INVOICE' : 'QUOTATION';
    const docNumberLabel = isInvoice ? 'Invoice No' : 'Quotation No';
    const dateLabel = isInvoice ? 'Invoice Date' : 'Quotation Date';

    // Seller / From details (with graceful fallbacks)
    const from = {
      name: doc.companyName || 'Your Company',
      address: doc.companyAddress || '',
      gstin: doc.companyGSTIN,
      pan: doc.companyPAN,
      email: doc.companyEmail,
      phone: doc.companyPhone,
      vendorCode: doc.companyVendorCode
    };

    const to = {
      name: doc.customerName || '',
      address: doc.customerAddress || '',
      gstin: doc.customerGSTIN,
      phone: doc.customerPhone
    };

    // Define the computed item type
    interface ComputedItem {
      index: number;
      title: string;
      description: string;
      hsnCode?: string;
      subtitle?: string;
      qty: number;
      rate: number;
      gstRate: number;
      amount: number;
      cgst: number;
      sgst: number;
      lineTotal: number;
    }

    // Compute per-line taxes and totals
    const computed = (doc.items || []).map((it: {
      quantity?: number;
      rate?: number;
      gstRate?: number;
      title?: string;
      description?: string;
      hsnCode?: string;
      [key: string]: any;
    }, i: number) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0);
      const gstRate = Number(it.gstRate || 0);
      const amount = qty * rate;
      const cgst = amount * (gstRate / 100) / 2;
      const sgst = amount * (gstRate / 100) / 2;
      const lineTotal = amount + cgst + sgst;
      const computedItem: ComputedItem = {
        ...it,
        index: i + 1,
        qty,
        rate,
        gstRate,
        amount,
        cgst,
        sgst,
        lineTotal: amount + cgst + sgst,
        title: it.title || '',
        description: it.description || ''
      };
      return computedItem;
    });

    const subAmount = computed.reduce((sum: number, r: ComputedItem) => sum + r.amount, 0);
    const cgstSum = computed.reduce((sum: number, r: ComputedItem) => sum + r.cgst, 0);
    const sgstSum = computed.reduce((sum: number, r: ComputedItem) => sum + r.sgst, 0);
    const rawTotal = subAmount + cgstSum + sgstSum;

    // Use provided roundOff if available, otherwise calculate it
    const roundOff = typeof doc.roundOff === 'number' ? doc.roundOff : 0;
    // Let caller override the nice grand total; otherwise use calculated total with round off
    const grandTotal = typeof doc.grandTotal === 'number'
      ? Number(doc.grandTotal)
      : Math.round(rawTotal - roundOff);

    // Helpers for display
    const formatRound = (n: number) => {
      const abs = Math.abs(n);
      const s = this.formatINR(abs);
      return n < 0 ? `(${s})` : s;
    };

    const title = isInvoice ? 'Invoice' : 'Estimate';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${docNumber} - ${from.name}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0; font-size: 14px; }
          .wrap { padding: 0; }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; }
          .header-left { flex: 1; }
          .title { font-size: 32px; font-weight: 400; color: ${primary}; margin: 0 0 8px 0; }
          .meta { display: grid; grid-template-columns: 100px 1fr; gap: 6px 0.5px; font-size: 12px; color: #111827; }
          .meta label { color: ${textMuted}; }
          .logo { max-width: 400px; max-height: 120px; object-fit: contain; }

          /* Cards */
          .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 5px; }
          .card {
            background: ${primaryLight};
            border-radius: 10px;
            padding: 14px 16px;
            page-break-inside: avoid;
          }
          .card h3 {
            color: ${primary};
            margin: 0 0 10px 0;
            font-weight: 400;
            font-size: 18px;
          }
          .card .line { font-size: 13px; line-height: 1.6; }
          .muted { color: ${textMuted}; }

          /* Supply row */
          .supply {
            display: flex; justify-content: space-between; margin: 16px 2px 10px;
            font-size: 13px; color: #111827;
          }
          .supply span.label { color: ${textMuted}; }

          /* Table */
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { padding: 11px 9px; font-size: 13px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
          thead th { background: ${primary}; color: #fff; border-bottom: none; }
          thead th:first-child { border-top-left-radius: 8px; }
          thead th:last-child  { border-top-right-radius: 8px; }
          tbody tr:last-child td { border-bottom: 1px solid #E5E7EB; }
          .right { text-align: right; }
          .center { text-align: center; }
          //.desc { font-weight: 600; }
          //.subdesc { font-weight: 400; color: ${textMuted}; margin-top: 2px; }

          /* Bottom grid */
          .bottom {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
          .panel {
            background: ${primaryLight};
            border-radius: 10px;
            padding: 14px 16px;
            page-break-inside: avoid;
          }
          .panel h4 {
            color: ${primary};
            margin: 0 0 10px 0;
            font-size: 14px;
          }
          .bank .line { 
            margin-bottom: 10px; 
            line-height: 1.2; 
          }

          .totals { 
            background: #fff; 
            border: 1px solid #E5E7EB; 
            border-radius: 10px; 
            padding: 14px 16px; 
            min-width: 200px;
          }
          .totals-row { 
            display: grid; 
            grid-template-columns: 1fr auto; 
            gap: 12px; 
            padding: 8px 0; 
            font-size: 14px; 
          }
          .totals-row.label { 
            color: ${textMuted}; 
            font-size: 13px;
          }
          .totals-row.bold { 
            font-weight: 700; 
            font-size: 16px; 
            border-top: 1px solid #E5E7EB; 
            margin-top: 8px; 
            padding-top: 12px; 
          }
          .amount-in-words {
            font-weight: 600;
            font-size: 12px;
            color: #000000;
            text-align: right;
            line-height: 1.3;
            max-width: 200px;
          }

          /* Terms */
          .terms { margin-top: 14px; font-size: 13px; }
          .terms h4 { margin: 0 0 6px 0; color: ${primary}; }
          .terms ol { margin: 0 0 4px 18px; padding: 0; }
          .terms li { margin: 2px 0; }

          /* Print behaviour */
          .avoid-break { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <div class="header-left">
              <h1 class="title">${isInvoice ? 'Invoice' : 'Estimate'}</h1>
              <div class="meta">
                <label>${isInvoice ? 'Invoice No #' : 'Quotation No #'}</label><div>${this.esc(String(docNumber || ''))}</div>
                <label>${isInvoice ? 'Invoice Date' : 'Quotation Date'}</label><div>${docDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                ${!isInvoice && validTill ? `<label>Valid Till</label><div>${new Date(validTill).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>` : ''}
              </div>
            </div>
              <img class="logo" src="data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'assets', 'pratham-logo.png')).toString('base64')}" alt="Pratham Logo" />
            </div>
          </div>

          <!-- FROM / TO -->
          <div class="cards">
            <div class="card">
              <h3>${isInvoice ? 'Billed By' : 'Quotation From'}</h3>
              <div class="line"><strong>${this.esc(from.name || 'Pratham Urja Solutions')}</strong></div>
              <div class="line">${this.esc(from.address || 'Lodhi puram Peepal Adda, Etah, Uttar Pradesh, India - 207001')}</div>
              <div class="line"><strong>GSTIN:</strong> ${this.esc(from.gstin || '09ABHFP5659C1ZZ')}</div>
              ${!isInvoice ? `<div class="line"><strong>PAN:</strong> ${this.esc(from.pan || 'ABHFP5659C')}</div>` : ''}
              <div class="line"><strong>Email:</strong> ${this.esc(from.email || 'prathamurjasolutions@gmail.com')}</div>
              <div class="line"><strong>Phone:</strong> ${this.esc(from.phone || '+919045013044')}</div>
              ${!isInvoice ? `<div class="line"><strong>UPNEDA Vendor Code:</strong> ${this.esc(from.vendorCode || 'ETAH2507263060')}</div>` : ''}
            </div>

            <div class="card">
              <h3>${isInvoice ? 'Billed To' : 'Quotation For'}</h3>
              <div class="line"><strong>${this.esc(to.name)}</strong></div>
              ${to.address ? `<div class="line">${this.esc(to.address)}</div>` : ''}
              ${to.gstin ? `<div class="line">GSTIN: ${this.esc(to.gstin)}</div>` : ''}
              ${to.phone ? `<div class="line">Phone: ${this.esc(to.phone)}</div>` : ''}
            </div>
          </div>

          <!-- SUPPLY INFO -->
          <div class="supply">
            <div><span class="label">Country of Supply:</span> ${this.esc(String(doc.countryOfSupply || 'India'))}</div>
            <div><span class="label">Place of Supply:</span> ${this.esc(String(doc.placeOfSupply || 'Uttar Pradesh(09)'))}</div>
          </div>

          <!-- ITEMS TABLE -->
          <table class="avoid-break">
            <thead>
              <tr>
                <th class="center" style="width:34px">Item</th>
                <th>Description</th>
                <th class="center" style="width:64px">Quantity</th>
                <th class="right" style="width:90px">Rate</th>
                <th class="center" style="width:64px">GST Rate</th>
                <th class="right" style="width:100px">Amount</th>
                <th class="right" style="width:90px">CGST</th>
                <th class="right" style="width:90px">SGST</th>
                <th class="right" style="width:110px">Total</th>
              </tr>
            </thead>
            <tbody>
              ${computed.map((r: ComputedItem) => `
                <tr>
                  <td class="center">${r.index}.</td>
                  <td>
                    <div class="desc"><strong>${this.esc(r.title || '')}</strong>${r.hsnCode ? ` <span class="muted">(HSN/SAC: ${this.esc(r.hsnCode)})</span>` : ''}</div>
                    ${r.description ? `<div class="subdesc">${this.esc(r.description)}</div>` : ''}
                  </td>
                  <td class="center">${this.esc(String(r.qty))}</td>
                  <td class="right">${this.formatINR(r.rate)}</td>
                  <td class="center">${this.esc(String(r.gstRate))}%</td>
                  <td class="right">${this.formatINR(r.amount)}</td>
                  <td class="right">${this.formatINR(r.cgst)}</td>
                  <td class="right">${this.formatINR(r.sgst)}</td>
                  <td class="right">${this.formatINR(r.lineTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- BANK + TOTALS -->
          <div class="bottom">
            ${!isInvoice ? `
            <div class="card bank">
              <h3>Bank Details</h3>
              <div class="line"><strong>Account Name: </strong>Pratham Urja Solutions</div>
              <div class="line"><strong>Account Number: </strong>50200112176921</div>
              <div class="line"><strong>Account Type: </strong>Current</div>
              <div class="line"><strong>IFSC: </strong>HDFC0000868</div>
              <div class="line"><strong>Bank & Branch: </strong>HDFC Bank - Etah</div>
            </div>
            ` : ` <div class="totals-row"><div class="amount-in-words">Total (in words)</div><div class="amount-in-words">${this.numberToWords(grandTotal)}</div></div> `}

            <div class="totals avoid-break">
              <div class="totals-row label"><div>Amount</div><div>${this.formatINR(subAmount)}</div></div>
              <div class="totals-row label"><div>CGST</div><div>${this.formatINR(cgstSum)}</div></div>
              <div class="totals-row label"><div>SGST</div><div>${this.formatINR(sgstSum)}</div></div>
              <div class="totals-row label"><div>Round Off</div><div>${formatRound(roundOff)}</div></div>
              <div class="totals-row bold"><div>Total (INR)</div><div>${this.formatINR(grandTotal)}</div></div>
            </div>
          </div>

          <!-- TERMS (only for estimate) -->
          ${!isInvoice ? `
          <div class="terms">
            <h4>Terms & Conditions</h4>
            <ol>
              <li>Amount once paid will not be refunded back in any circumstances.</li>
              <li>Warranties of products will be given by their respective manufacturers.</li>
              <li>For any disputes, jurisdiction will be Etah only.</li>
            </ol>
          </div>
          ` : ''}
          </body>
    </html>
    `;
  }

  private async generatePDF(html: string): Promise<Buffer> {
    // In development, use the locally installed Chrome/Chromium
    const isDev = process.env.NODE_ENV === 'development';
    
    // Try to find Chrome in common locations
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Google\\Chrome\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\chrome.exe'
    ];

    let executablePath: string | undefined;
    
    if (isDev) {
      // In development, try to find Chrome in common locations
      const fs = require('fs');
      for (const path of chromePaths) {
        if (fs.existsSync(path)) {
          executablePath = path;
          console.log(`✅ Found Chrome at: ${path}`);
          break;
        }
      }
      
      if (!executablePath) {
        console.warn('⚠️ Could not find Chrome in standard locations. Trying default...');
      }
    } else {
      // In production, use the bundled Chromium
      try {
        executablePath = await chromium.executablePath();
      } catch (error) {
        console.error('❌ Failed to get Chromium executable path:', error);
      }
    }

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        ...(isDev ? [] : chromium?.args || [])
      ] as const,  // Add const assertion to ensure type safety
      defaultViewport: { width: 1200, height: 800 },
      ...(executablePath ? { executablePath } : {}),
      headless: true,  // Use boolean true for headless mode
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export const puppeteerPDFGenerator = new PuppeteerPDFGenerator();
