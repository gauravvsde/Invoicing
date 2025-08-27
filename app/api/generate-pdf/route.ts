export const config = {
  runtime: "nodejs20.x",
};

import { NextResponse } from 'next/server';
import { puppeteerPDFGenerator } from '@/lib/puppeteer-pdf-generator';
import type { Quotation } from '@/types/quotation';

export async function POST(request: Request) {
  try {
    const quotation: Quotation = await request.json();
    console.log('🟣 [API] Received request to generate PDF for quotation:', {
      quotationNumber: quotation.quotationNumber,
      timestamp: new Date().toISOString()
    });
    
    const pdfBytes = await puppeteerPDFGenerator.generateQuotationPDF(quotation);
    console.log('✅ [API] Successfully generated PDF, size:', pdfBytes.length, 'bytes');
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation-${quotation.quotationNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
