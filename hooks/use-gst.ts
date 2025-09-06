"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useQuotations } from "./use-quotations"
import { useInvoices } from "./use-invoices"
import { useFirestore } from "./useFirestore"
import { orderBy, where, doc, deleteDoc, setDoc, getDoc, writeBatch } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { GSTRecord, GSTSummary, GSTReturn } from "../types/gst"
import type { FirestoreError } from "firebase/firestore"

export function useGST() {
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

  // Get GST summary for a period (e.g., a month)
  const getGSTSummary = (month: string): GSTSummary => {
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
  }

  // Get current month's GST summary
  const getCurrentMonthSummary = (): GSTSummary => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
    return getGSTSummary(currentMonth)
  }

  // Get total GST collected
  const getTotalGSTCollected = (): number => {
    return gstRecords
      .filter(r => r.type === 'collected')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
  }

  // Get total GST paid
  const getTotalGSTPaid = (): number => {
    return gstRecords
      .filter(r => r.type === 'paid')
      .reduce((sum, r) => sum + (r.gstAmount || 0), 0)
  }

  // Get net GST liability
  const getNetGSTLiability = (): number => {
    return getTotalGSTCollected() - getTotalGSTPaid()
  }

  // Debug logging for loading state and data
  console.log('[useGST] Loading state:', loading);
  console.log('[useGST] GST Records count:', gstRecords?.length || 0);
  console.log('[useGST] GST Returns count:', gstReturns?.length || 0);
  console.log('[useGST] Error:', error || apiError);

  return {
    gstRecords,
    gstReturns,
    loading,
    error: error || apiError,
    addGSTRecord,
    updateGSTRecord,
    removeGSTRecord,
    fileGSTReturn,
    updateGSTReturn,
    getGSTSummary,
    getCurrentMonthSummary,
    getTotalGSTCollected,
    getTotalGSTPaid,
    getNetGSTLiability,
    generateGSTRecords
  }
}
