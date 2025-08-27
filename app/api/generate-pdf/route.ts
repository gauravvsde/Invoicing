export const config = {
  runtime: "nodejs20.x",
};

import { NextResponse } from 'next/server';
import { puppeteerPDFGenerator } from '@/lib/puppeteer-pdf-generator';
import type { Quotation } from '@/types/quotation';
import type { Invoice } from '@/types/invoice';

type Document = (Quotation | Invoice) & { type?: 'quotation' | 'invoice' };

export async function POST(request: Request) {
  try {
    const document: Document = await request.json();
    const isInvoice = document.type === 'invoice';
    const docType = isInvoice ? 'invoice' : 'quotation';
    const docNumber = isInvoice ? (document as Invoice).invoiceNumber : (document as Quotation).quotationNumber;
    
    console.log(`🟣 [API] Received request to generate PDF for ${docType}:`, {
      number: docNumber,
      timestamp: new Date().toISOString()
    });
    
    const pdfBytes = isInvoice 
      ? await puppeteerPDFGenerator.generateInvoicePDF(document as Invoice)
      : await puppeteerPDFGenerator.generateQuotationPDF(document as Quotation);
      
    console.log(`✅ [API] Successfully generated ${docType} PDF, size:`, pdfBytes.length, 'bytes');
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${docType}-${docNumber}.pdf"`,
      },
    });
  } catch (error) {
    const errorResponse = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      // @ts-ignore
      code: error?.code,
      // @ts-ignore
      statusCode: error?.statusCode,
    };

    console.error('❌ [API] Error generating PDF:', error);
    console.error('❌ [API] Error details:', JSON.stringify(errorResponse, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: errorResponse.message,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' ? { stack: errorResponse.stack } : {})
      },
      { status: 500 }
    );
  }
}
