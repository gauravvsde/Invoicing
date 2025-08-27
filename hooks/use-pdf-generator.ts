import { useCallback } from 'react';
import type { Quotation } from '@/types/quotation';
import type { Invoice } from '@/types/invoice';

export function usePdfGenerator() {
  const generateQuotationPdf = useCallback(async (quotation: Quotation) => {
    try {
      console.log('🟣 [usePdfGenerator] Starting PDF generation for quotation:', {
        quotationNumber: quotation.quotationNumber,
        timestamp: new Date().toISOString()
      });
      
      const apiUrl = `/api/generate-pdf?ts=${Date.now()}`;
      console.log('🔵 [usePdfGenerator] Calling API:', apiUrl);
      
      // Log the base URL to ensure we're making the request to the right place
      console.log('🔵 [usePdfGenerator] Base URL:', window.location.origin);
      
      // Add a test fetch to check if the API is reachable
      try {
        console.log('🔵 [usePdfGenerator] Testing API endpoint...');
        const testResponse = await fetch('/api/health', { method: 'GET' });
        const testData = await testResponse.text();
        console.log('🔵 [usePdfGenerator] Health check response:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          data: testData
        });
      } catch (testError) {
        console.error('❌ [usePdfGenerator] API health check failed:', testError);
      }
      
      console.log('🔵 [usePdfGenerator] Sending request to:', apiUrl);
      console.log('🔵 [usePdfGenerator] Request payload:', {
        quotationNumber: quotation.quotationNumber,
        itemsCount: quotation.items.length,
        total: quotation.totalAmount
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotation),
      }).catch(error => {
        console.error('❌ [usePdfGenerator] Network error:', error);
        throw new Error(`Network error: ${error.message}`);
      });

      console.log('🟢 [usePdfGenerator] API Response status:', response.status);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('❌ [usePdfGenerator] API Error Response:', errorText);
        } catch (e) {
          errorText = 'Could not parse error response';
          console.error('❌ [usePdfGenerator] Could not parse error response:', e);
        }
        
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        console.error('❌ [usePdfGenerator] API Error:', errorInfo);
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }

      // Get the PDF as a blob
      const blob = await response.blob();
      console.log('✅ [usePdfGenerator] Received PDF blob, size:', blob.size, 'bytes');
      
      const url = window.URL.createObjectURL(blob);
      console.log('🔵 [usePdfGenerator] Created object URL for download');
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation-${quotation.quotationNumber}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 0);
      
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return false;
    }
  }, []);

  const generateInvoicePdf = useCallback(async (invoice: Invoice) => {
    try {
      console.log('🟣 [usePdfGenerator] Starting PDF generation for invoice:', {
        invoiceNumber: invoice.invoiceNumber,
        timestamp: new Date().toISOString()
      });
      
      const apiUrl = `/api/generate-pdf?ts=${Date.now()}`;
      console.log('🔵 [usePdfGenerator] Calling API for invoice:', apiUrl);
      
      // Add a test fetch to check if the API is reachable
      try {
        console.log('🔵 [usePdfGenerator] Testing API endpoint...');
        const testResponse = await fetch('/api/health', { method: 'GET' });
        const testData = await testResponse.text();
        console.log('🔵 [usePdfGenerator] Health check response:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          data: testData
        });
      } catch (testError) {
        console.error('❌ [usePdfGenerator] API health check failed:', testError);
      }
      
      console.log('🔵 [usePdfGenerator] Sending invoice request to:', apiUrl);
      console.log('🔵 [usePdfGenerator] Invoice request payload:', {
        invoiceNumber: invoice.invoiceNumber,
        itemsCount: invoice.items?.length || 0,
        total: invoice.totalAmount,
        type: 'invoice' // Add type to distinguish between quotation and invoice
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invoice,
          type: 'invoice' // Add type to the request body
        }),
      }).catch(error => {
        console.error('❌ [usePdfGenerator] Network error:', error);
        throw new Error(`Network error: ${error.message}`);
      });

      console.log('🟢 [usePdfGenerator] Invoice API Response status:', response.status);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('❌ [usePdfGenerator] Invoice API Error Response:', errorText);
        } catch (e) {
          errorText = 'Could not parse error response';
          console.error('❌ [usePdfGenerator] Could not parse error response:', e);
        }
        
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        console.error('❌ [usePdfGenerator] Invoice API Error:', errorInfo);
        throw new Error(`Failed to generate invoice PDF: ${response.status} ${response.statusText}`);
      }

      // Get the PDF as a blob
      const blob = await response.blob();
      console.log('✅ [usePdfGenerator] Received invoice PDF blob, size:', blob.size, 'bytes');
      
      const url = window.URL.createObjectURL(blob);
      console.log('🔵 [usePdfGenerator] Created object URL for invoice download');
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 0);
      
      return true;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      return false;
    }
  }, []);

  return {
    generateQuotationPdf,
    generateInvoicePdf,
  };
}
