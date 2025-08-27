// import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Quotation } from '@/types/quotation';
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

  private esc(str?: string) {
    return (str ?? '').replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]!));
  }

  private async getTemplate(quotation: Quotation): Promise<string> {
    const primary = '#6F42C1';        // purple
    const primaryLight = '#F4EEFF';   // light purple panel
    const textMuted = '#6b7280';

    const createdAt = quotation.createdAt ? new Date(quotation.createdAt) : new Date();
    const validTill = quotation['validUntil'] ? new Date(quotation['validUntil'] as any) : undefined;

    // Seller / From details (with graceful fallbacks)
    const from = {
      name: quotation['companyName'] || 'Your Company',
      address: quotation['companyAddress'] || '',
      gstin: quotation['companyGSTIN'],
      pan: quotation['companyPAN'],
      email: quotation['companyEmail'],
      phone: quotation['companyPhone'],
      vendorCode: quotation['companyVendorCode']
    };

    const to = {
      name: quotation.customerName || '',
      address: quotation.customerAddress || '',
      gstin: quotation.customerGSTIN,
      phone: quotation['customerPhone']
    };

    // Compute per-line taxes and totals
    const computed = (quotation.items || []).map((it: any, i: number) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0);
      const gstRate = Number(it.gstRate || 0);
      const amount = qty * rate;
      const cgst = amount * (gstRate / 100) / 2;
      const sgst = amount * (gstRate / 100) / 2;
      const lineTotal = amount + cgst + sgst;
      return { index: i + 1, ...it, qty, rate, gstRate, amount, cgst, sgst, lineTotal };
    });

    const subAmount = computed.reduce((s, r) => s + r.amount, 0);
    const cgstSum = computed.reduce((s, r) => s + r.cgst, 0);
    const sgstSum = computed.reduce((s, r) => s + r.sgst, 0);
    const rawTotal = subAmount + cgstSum + sgstSum;

    // Let caller override the nice grand total; otherwise round to whole rupee
    const grandTotal =
      typeof (quotation as any).grandTotal === 'number'
        ? Number((quotation as any).grandTotal)
        : Math.round(rawTotal);

    const roundOff = grandTotal - rawTotal;

    // Helpers for display
    const formatRound = (n: number) => {
      const abs = Math.abs(n);
      const s = this.formatINR(abs);
      return n < 0 ? `(${s})` : s;
    };

    const title = 'Estimate';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${this.esc(title)} • ${this.esc(String(quotation.quotationNumber || ''))}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0; }
    .wrap { padding: 0; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left { flex: 1; }
    .title { font-size: 32px; font-weight: 700; color: ${primary}; margin: 0 0 8px 0; }
    .meta { display: grid; grid-template-columns: 100px 1fr; gap: 6px 0.5px; font-size: 12px; color: #111827; }
    .meta label { color: ${textMuted}; }
    .logo { max-width: 140px; max-height: 60px; object-fit: contain; }

    /* Cards */
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    .card {
      background: ${primaryLight};
      border-radius: 10px;
      padding: 14px 16px;
      page-break-inside: avoid;
    }
    .card h3 {
      color: ${primary};
      margin: 0 0 8px 0;
      font-size: 16px;
    }
    .card .line { font-size: 12px; line-height: 1.5; }
    .muted { color: ${textMuted}; }

    /* Supply row */
    .supply {
      display: flex; justify-content: space-between; margin: 14px 2px 8px;
      font-size: 12px; color: #111827;
    }
    .supply span.label { color: ${textMuted}; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { padding: 10px 8px; font-size: 12px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
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
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;
    }
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

    .totals { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 14px; }
    .totals-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 6px 0; font-size: 12px; }
    .totals-row.label { color: ${textMuted}; }
    .totals-row.bold { font-weight: 700; font-size: 14px; border-top: 1px solid #E5E7EB; margin-top: 6px; padding-top: 10px; }

    /* Terms */
    .terms { margin-top: 14px; font-size: 12px; }
    .terms h4 { margin: 0 0 6px 0; color: ${primary}; }
    .terms ol { margin: 0 0 4px 18px; padding: 0; }
    .terms li { margin: 2px 0; }

    /* Print behaviour */
    .avoid-break { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <h1 class="title">${this.esc(title)}</h1>
        <div class="meta">
          <label>Quotation No #</label><div>${this.esc(String(quotation.quotationNumber || ''))}</div>
          <label>Quotation Date</label><div>${createdAt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
          ${validTill ? `<label>Valid Till Date</label><div>${validTill.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>` : ''}
        </div>
      </div>
      ${quotation.companyLogo ? `<img class="logo" src="${this.esc(quotation.companyLogo)}" />` : ''}
    </div>

    <!-- FROM / TO -->
    <div class="cards">
      <div class="card">
        <h3>Quotation From</h3>
        <div class="line"><strong>${this.esc(from.name)}</strong></div>
        ${from.address ? `<div class="line">${this.esc(from.address)}</div>` : ''}
        ${from.gstin ? `<div class="line"><strong>GSTIN:</strong> ${this.esc(from.gstin)}</div>` : ''}
        ${from.pan ? `<div class="line"><strong>PAN:</strong> ${this.esc(from.pan)}</div>` : ''}
        ${from.email ? `<div class="line"><strong>Email:</strong> ${this.esc(from.email)}</div>` : ''}
        ${from.phone ? `<div class="line"><strong>Phone:</strong> ${this.esc(from.phone)}</div>` : ''}
        ${from.vendorCode ? `<div class="line"><strong>UPNEDA Vendor Code:</strong> ${this.esc(from.vendorCode)}</div>` : ''}
      </div>

      <div class="card">
        <h3>Quotation For</h3>
        <div class="line"><strong>${this.esc(to.name)}</strong></div>
        ${to.address ? `<div class="line">${this.esc(to.address)}</div>` : ''}
        ${to.gstin ? `<div class="line">GSTIN: ${this.esc(to.gstin)}</div>` : ''}
        ${to.phone ? `<div class="line">Phone: ${this.esc(to.phone)}</div>` : ''}
      </div>
    </div>

    <!-- SUPPLY INFO -->
    <div class="supply">
      <div><span class="label">Country of Supply:</span> ${this.esc(String(quotation['countryOfSupply'] || 'India'))}</div>
      <div><span class="label">Place of Supply:</span> ${this.esc(String(quotation['placeOfSupply'] || 'Uttar Pradesh(09)'))}</div>
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
        ${computed.map(r => `
          <tr>
            <td class="center">${r.index}.</td>
            <td>
              <div class="desc">${this.esc(r.description || '')}${r.hsnCode ? ` <span class="muted">(HSN/SAC: ${this.esc(r.hsnCode)})</span>` : ''}</div>
              ${r.subtitle ? `<div class="subdesc">${this.esc(r.subtitle)}</div>` : ''}
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
      <div class="card bank">
        <h3>Bank Details</h3>
        <div class="line"><strong>Account Name: </strong>Pratham Urja Solutions</div>
        <div class="line"><strong>Account Number: </strong>50200112176921</div>
        <div class="line"><strong>Account Type: </strong>Current</div>
        <div class="line"><strong>IFSC: </strong>HDFC0000868</div>
        <div class="line"><strong>Bank & Branch: </strong>HDFC Bank - Etah</div>
      </div>

      <div class="totals avoid-break">
        <div class="totals-row label"><div>Amount</div><div>${this.formatINR(subAmount)}</div></div>
        <div class="totals-row label"><div>CGST</div><div>${this.formatINR(cgstSum)}</div></div>
        <div class="totals-row label"><div>SGST</div><div>${this.formatINR(sgstSum)}</div></div>
        <div class="totals-row label"><div>Round Off</div><div>${formatRound(roundOff)}</div></div>
        <div class="totals-row bold"><div>Total (INR)</div><div>${this.formatINR(grandTotal)}</div></div>
      </div>
    </div>

    <!-- TERMS -->
    <div class="terms">
      <h4>Terms & Conditions</h4>
      <ol>
        <li> Amount once paid will not be refund back in any circumstances.</li>
        <li>Warranties of products will be given by their respective manufacturers.</li>
        <li>For any disputes, jurisdiction will be Etah only.</li>
      </ol>
    </div>
  </div>
</body>
</html>
    `;
  }

  async generateQuotationPDF(quotation: Quotation): Promise<Uint8Array> {
    const isProd = !!process.env.AWS_REGION || !!process.env.VERCEL;

    const browser = await puppeteer.launch(
      isProd
        ? {
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          }
        : {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // for local, if you also have puppeteer installed, you can use:
            executablePath:
              process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : process.platform === 'darwin'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : '/usr/bin/google-chrome',
          },
    );

    try {
      const page = await browser.newPage();
      const htmlContent = await this.getTemplate(quotation);

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }
}

export const puppeteerPDFGenerator = new PuppeteerPDFGenerator();
