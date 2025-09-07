export type TimeRange = 'monthly' | 'yearly';

export interface GSTFilterOptions {
  year: number;
  month?: number; // 1-12, undefined if yearly view
  type?: 'collected' | 'paid' | 'all';
  status?: 'filed' | 'unfiled' | 'all';
}

export interface GSTReportData {
  period: string; // 'YYYY-MM' or 'YYYY'
  gstCollected: number;
  gstPaid: number;
  netGST: number;
  records: any[]; // You might want to create a more specific type for this
  totalInvoices?: number;
}

export interface ExcelExportOptions extends GSTFilterOptions {
  includeDetails: boolean;
}
