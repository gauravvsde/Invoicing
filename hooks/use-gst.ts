"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useQuotations } from "./use-quotations"
import { useInvoices } from "./use-invoices"
import { GSTFilterOptions, TimeRange, GSTReportData, ExcelExportOptions } from "@/types/gst-filters"
import * as XLSX from 'xlsx';
import { useFirestore } from "./useFirestore"
import { orderBy, where, doc, deleteDoc, setDoc, getDoc, writeBatch } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { GSTRecord, GSTSummary, GSTReturn } from "../types/gst"
import type { FirestoreError } from "firebase/firestore"

export function useGST() {
  // Filter state
  const [filters, setFilters] = useState<GSTFilterOptions>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type: 'all',
    status: 'all'
  });
  
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  const { data: gstRecords, loading, error, saveDocument, deleteDocument } = 
    useFirestore<GSTRecord>('gstRecords', {
      queryConstraints: [orderBy('date', 'desc')],
      includeTimestamps: true
    })
  
  const { data: gstReturns, saveDocument: saveGstReturn } = 
    useFirestore<GSTReturn>('gstReturns', {
      queryConstraints: [orderBy('period', 'desc')],
      includeTimestamps: true
    })

  const [apiError, setApiError] = useState<string | null>(null)

  const { invoices } = useInvoices()

  // Track processed invoice IDs to prevent duplicate processing
  const processedInvoiceIds = useRef<Set<string>>(new Set());

  // Generate GST records from invoices with duplicate prevention
  const generateGSTRecords = useCallback(async () => {
    if (!invoices.length) return;

    try {
      // Get invoices that need GST records and haven't been processed yet
      const invoicesToProcess = invoices.filter(
        invoice => 
          invoice.gstAmount > 0 && 
          !processedInvoiceIds.current.has(invoice.id) &&
          !gstRecords.some(r => r.invoiceId === invoice.id)
      );

      if (!invoicesToProcess.length) return;

      console.log(`Processing ${invoicesToProcess.length} invoices for GST records`);

      // Process in batches to avoid too many concurrent operations
      const BATCH_SIZE = 5;
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const invoice of invoicesToProcess) {
        try {
          // Mark as processed immediately to prevent duplicate processing
          processedInvoiceIds.current.add(invoice.id);
          
          const date = new Date(invoice.createdAt);
          const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          const quarter = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
          
          // Create a deterministic ID for the GST record
          const gstRecordId = `gst_${invoice.id}`;
          
          // Double-check if the record exists (in case of race conditions)
          const existingDoc = await getDoc(doc(db, 'gstRecords', gstRecordId));
          if (existingDoc.exists()) {
            console.log(`GST record already exists for invoice ${invoice.id}`);
            continue;
          }
          
          // Create the GST record
          const newRecord: Omit<GSTRecord, 'id'> = {
            type: "collected",
            amount: invoice.totalAmount,
            gstAmount: invoice.gstAmount,
            date: invoice.createdAt,
            month,
            quarter,
            year: date.getFullYear().toString(),
            invoiceId: invoice.id,
            description: `GST from invoice #${invoice.invoiceNumber}`,
            status: "unfiled",
            paymentStatus: invoice.paid ? "paid" : "pending",
            customerName: invoice.customerName,
            customerGSTIN: invoice.customerGSTIN || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _createdBy: typeof window !== 'undefined' ? window.location.href : 'server'
          };
          
          // Add to batch
          batch.set(doc(db, 'gstRecords', gstRecordId), newRecord);
          batchCount++;
          
          // Execute batch if we've reached batch size
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batchCount = 0;
          }
        } catch (error) {
          console.error(`Error processing invoice ${invoice.id}:`, error);
          // Remove from processed set to retry later
          processedInvoiceIds.current.delete(invoice.id);
        }
      }
      
      // Commit any remaining operations in the batch
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log('Finished processing GST records');
    } catch (err) {
      console.error("Error generating GST records:", err)
      setApiError("Failed to generate GST records")
    }
  }, [invoices, gstRecords, saveDocument])

  // Track if we're currently processing to prevent concurrent runs
  const isProcessing = useRef(false);
  const cleanupRef = useRef<() => void>(() => {});

  // Effect to generate GST records when invoices change
  useEffect(() => {
    // Skip if no invoices or already processing
    if (invoices.length === 0 || isProcessing.current) return;

    // Set processing flag
    isProcessing.current = true;
    
    // Generate records
    generateGSTRecords().finally(() => {
      isProcessing.current = false;
    });

    // Cleanup function to cancel any in-progress operations
    return () => {
      // This will be called when the component unmounts or before re-running the effect
      isProcessing.current = false;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [invoices, generateGSTRecords]);

  // Add a manual GST record
  const addGSTRecord = async (record: Omit<GSTRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<GSTRecord> => {
    try {
      // Create a new GST record with required fields
      const newRecord: Omit<GSTRecord, 'id'> = {
        ...record,
        status: 'unfiled',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Save the document and get its ID
      const docId = await saveDocument(newRecord)
      
      // Return the complete record with the generated ID
      return {
        ...newRecord,
        id: docId
      }
    } catch (err) {
      console.error("Error adding GST record:", err)
      setApiError("Failed to add GST record")
      throw err
    }
  }

  // Update a GST record
  const updateGSTRecord = async (id: string, updates: Partial<GSTRecord>) => {
    try {
      await saveDocument({ ...updates, id } as GSTRecord)
    } catch (err) {
      console.error("Error updating GST record:", err)
      setApiError("Failed to update GST record")
      throw err
    }
  }

  // Delete a GST record
  const removeGSTRecord = async (id: string) => {
    try {
      await deleteDocument(id)
    } catch (err) {
      console.error("Error deleting GST record:", err)
      setApiError("Failed to delete GST record")
      throw err
    }
  }

  // File GST return for a period
  const fileGSTReturn = async (period: string, records: GSTRecord[], type: 'monthly' | 'quarterly') => {
    try {
      const totalGST = records.reduce((sum, record) => sum + (record.amount || 0), 0)
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 20); // Assuming due date is 20th of next month

      const gstReturn: GSTReturn = {
        id: '', // Will be auto-generated by Firestore
        period,
        type,
        dueDate: dueDate.toISOString(),
        netGST: totalGST, // Simplified, assuming totalGST is the net liability
        records: records.map(r => r.id || ''),
        totalGST,
        status: 'filed',
        filedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
      
      await saveGstReturn(gstReturn)
      
      // Update records to mark them as filed
      await Promise.all(
        records.map(record => 
          updateGSTRecord(record.id || '', { status: 'filed' })
        )
      )
      
      return true
    } catch (err) {
      console.error("Error filing GST return:", err)
      setApiError("Failed to file GST return")
      throw err
    }
  }

  // Update a GST return
  const updateGSTReturn = async (id: string, updates: Partial<GSTReturn>) => {
    try {
      await saveGstReturn({ ...updates, id } as GSTReturn)
    } catch (err) {
      console.error("Error updating GST return:", err)
      setApiError("Failed to update GST return")
      throw err
    }
  }


  // Get filtered records based on current filters
  const getFilteredRecords = useCallback((): GSTRecord[] => {
    return gstRecords.filter(record => {
      // Filter by year if specified
      if (filters.year && record.year !== filters.year.toString()) {
        return false;
      }
      
      // Filter by month if specified and record has a month
      if (filters.month && record.month) {
        const [recordYear, recordMonth] = record.month.split('-').map(Number);
        if (recordMonth !== filters.month) {
          return false;
        }
      }
      
      // Filter by type if specified
      if (filters.type && filters.type !== 'all' && record.type !== filters.type) {
        return false;
      }
      
      // Filter by status if specified
      if (filters.status && filters.status !== 'all' && record.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [gstRecords, filters])

  // Get total GST collected
  const getTotalGSTCollected = useCallback((): number => {
    return getFilteredRecords()
      .filter(r => r.type === 'collected')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
  }, [getFilteredRecords])

  // Get total GST paid
  const getTotalGSTPaid = useCallback((): number => {
    return getFilteredRecords()
      .filter(r => r.type === 'paid')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
  }, [getFilteredRecords])

  // Get net GST liability
  const getNetGSTLiability = useCallback((): number => {
    return getTotalGSTCollected() - getTotalGSTPaid()
  }, [getTotalGSTCollected, getTotalGSTPaid])
  
  // Get GST summary for a period (e.g., a month)
  const getGSTSummary = useCallback((month: string): GSTSummary => {
    const monthRecords = gstRecords.filter(record => record.month === month)
    
    const gstCollected = monthRecords
      .filter(r => r.type === 'collected')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
      
    const gstPaid = monthRecords
      .filter(r => r.type === 'paid')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
      
    const netGST = gstCollected - gstPaid
    
    return {
      month,
      gstCollected,
      gstPaid,
      netGST,
    }
  }, [gstRecords])
  
  // Get current month's GST summary
  const getCurrentMonthSummary = useCallback((): GSTSummary => {
    const month = filters.month || new Date().getMonth() + 1;
    const year = filters.year || new Date().getFullYear();
    const currentMonth = `${year}-${month.toString().padStart(2, '0')}`;
    return getGSTSummary(currentMonth);
  }, [filters.month, filters.year, getGSTSummary])

  // Filtered records based on current filters
  const filteredRecords = useMemo(() => {
    return gstRecords.filter(record => {
      // Filter by year
      const recordYear = new Date(record.date).getFullYear();
      if (recordYear !== filters.year) return false;
      
      // Filter by month if in monthly view
      if (timeRange === 'monthly' && filters.month !== undefined) {
        const recordMonth = new Date(record.date).getMonth() + 1;
        if (recordMonth !== filters.month) return false;
      }
      
      // Filter by type
      if (filters.type !== 'all' && record.type !== filters.type) return false;
      
      // Filter by status
      if (filters.status !== 'all' && record.status !== filters.status) return false;
      
      return true;
    });
  }, [gstRecords, filters, timeRange]);

  // Generate report data for the current filters
  const generateReportData = useCallback((): GSTReportData[] => {
    const periods = new Map<string, { collected: number; paid: number; records: any[] }>();
    
    filteredRecords.forEach(record => {
      const period = timeRange === 'monthly' 
        ? record.month 
        : record.year;
      
      if (!periods.has(period)) {
        periods.set(period, { collected: 0, paid: 0, records: [] });
      }
      
      const periodData = periods.get(period)!;
      periodData.records.push(record);
      
      if (record.type === 'collected') {
        periodData.collected += record.gstAmount || 0;
      } else {
        periodData.paid += record.gstAmount || 0;
      }
    });
    
    const reportData: GSTReportData[] = [];
    periods.forEach((data, period) => {
      reportData.push({
        period,
        gstCollected: data.collected,
        gstPaid: data.paid,
        netGST: data.collected - data.paid,
        records: data.records,
        totalInvoices: data.records.length
      });
    });
    
    // Sort by period
    reportData.sort((a, b) => a.period.localeCompare(b.period));
    
    return reportData;
  }, [filteredRecords, timeRange]);

  // Export to Excel
  const exportToExcel = useCallback(async (options: ExcelExportOptions) => {
    try {
      const reportData = generateReportData();
      const wb = XLSX.utils.book_new();
      
      // Create summary sheet
      const summaryData = reportData.map((item: GSTReportData) => ({
        'Period': item.period,
        'GST Collected': item.gstCollected,
        'GST Paid': item.gstPaid,
        'Net GST': item.netGST,
        'Number of Records': item.totalInvoices || 0
      }));
      
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(summaryData),
        'GST Summary'
      );
      
      // Add detailed data if requested
      if (options.includeDetails) {
        const details = reportData.flatMap((period: GSTReportData) => 
          period.records.map((record: any) => ({
            'Date': record.date,
            'Type': record.type,
            'Description': record.description,
            'Amount': record.amount,
            'GST Amount': record.gstAmount,
            'Status': record.status,
            'Payment Status': record.paymentStatus,
            'Customer': record.customerName || 'N/A',
            'GSTIN': record.customerGSTIN || 'N/A'
          }))
        );
        
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(details),
          'Detailed Records'
        );
      }
      
      // Generate file name
      const fileName = `GST_Report_${filters.year}${timeRange === 'monthly' ? `_${filters.month?.toString().padStart(2, '0')}` : ''}.xlsx`;
      
      // Save the file
      XLSX.writeFile(wb, fileName);
      
      return true;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return false;
    }
  }, [generateReportData, filters, timeRange]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<GSTFilterOptions>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Toggle time range
  const toggleTimeRange = useCallback(() => {
    setTimeRange(prev => prev === 'monthly' ? 'yearly' : 'monthly');
  }, []);

  // Debug logging for loading state and data
  console.log('[useGST] Loading state:', loading);
  console.log('[useGST] GST Records count:', gstRecords?.length || 0);
  console.log('[useGST] GST Returns count:', gstReturns?.length || 0);
  console.log('[useGST] Error:', error || apiError);

  return {
    gstRecords: filteredRecords,
    gstReturns,
    loading,
    error,
    addGSTRecord,
    updateGSTRecord,
    removeGSTRecord,
    fileGSTReturn,
    updateGSTReturn,
    generateGSTRecords,
    generateReportData,
    getTotalGSTCollected,
    getTotalGSTPaid,
    getNetGSTLiability,
    getGSTSummary,
    getCurrentMonthSummary,
    filters,
    timeRange,
    updateFilters,
    toggleTimeRange,
    exportToExcel,
  }
}
