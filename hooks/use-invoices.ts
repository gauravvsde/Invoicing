"use client"

import { useState, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { getDoc, deleteDoc, where, query, getDocs, setDoc, addDoc } from "firebase/firestore"
import { orderBy, doc, updateDoc, collection } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Invoice } from "../types/invoice"
import type { Quotation } from "../types/quotation"
import type { GSTRecord } from "../types/gst"
import { useFirestore } from "./useFirestore"

export function useInvoices() {
  const {
    data: invoices,
    loading,
    error,
    saveDocument: saveInvoice,
    deleteDocument: deleteInvoice,
  } = useFirestore<Invoice>('invoices', {
    queryConstraints: [orderBy('createdAt', 'desc')],
    includeTimestamps: true,
  })

  const [apiError, setApiError] = useState<string | null>(null)
  const { user } = useAuth()

  // Function to update or create GST record for an invoice
  const updateGSTRecord = useCallback(async (invoice: Invoice) => {
    try {
      console.log('Updating GST record for invoice:', invoice.id);
      if (!invoice.id) {
        console.error('Cannot update GST record: No invoice ID provided');
        return;
      }
      
      const now = new Date().toISOString();
      const invoiceDate = new Date(invoice.invoiceDate || now);
      const month = invoiceDate.toISOString().slice(0, 7); // YYYY-MM format
      const quarter = `${invoiceDate.getFullYear()}-Q${Math.ceil((invoiceDate.getMonth() + 1) / 3)}`;
      const year = invoiceDate.getFullYear().toString();
      
      if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
        console.error('Cannot update GST record: Invoice has no items');
        return;
      }
      
      // Calculate total GST amount (sum of all items' GST)
      const totalGST = invoice.items.reduce((sum, item) => {
        if (!item || typeof item.quantity !== 'number' || !item.rate) return sum;
        const itemTotal = item.quantity * item.rate;
        const itemGST = (itemTotal * (item.gstRate || 0)) / 100;
        return sum + itemGST;
      }, 0);
      
      console.log('Calculated total GST:', totalGST);
      
      // Check if a GST record already exists for this invoice
      const gstRecordsQuery = query(
        collection(db, 'gstRecords'),
        where('invoiceId', '==', invoice.id)
      );
      
      const querySnapshot = await getDocs(gstRecordsQuery);
      const existingRecord = querySnapshot.docs[0];
      
      const gstRecordData: Omit<GSTRecord, 'id'> = {
        type: 'collected',
        amount: invoice.totalAmount || 0,
        gstAmount: totalGST,
        gstRate: invoice.items[0]?.gstRate || 18,
        description: `GST collected for invoice ${invoice.invoiceNumber || 'N/A'}`,
        status: 'unfiled',
        paymentStatus: invoice.status === 'paid' ? 'paid' : 'pending',
        invoiceId: invoice.id,
        customerName: invoice.customerName || 'Unknown',
        customerGSTIN: invoice.customerGSTIN || '',
        date: invoice.invoiceDate || now.split('T')[0],
        month,
        quarter,
        year,
        createdAt: invoice.createdAt || now,
        updatedAt: now,
        _createdBy: user?.uid || ''
      };
      
      console.log('GST Record Data:', gstRecordData);
      
      if (existingRecord) {
        console.log('Updating existing GST record:', existingRecord.id);
        await updateDoc(doc(db, 'gstRecords', existingRecord.id), gstRecordData);
        console.log('Successfully updated GST record');
      } else {
        console.log('Creating new GST record');
        const docRef = await addDoc(collection(db, 'gstRecords'), gstRecordData);
        console.log('Successfully created GST record with ID:', docRef.id);
      }
    } catch (error) {
      console.error('Error updating GST record:', error);
      throw error;
    }
  }, [user?.uid]);

  // Wrap saveInvoice to include GST record updates
  const saveInvoiceWithGST = useCallback(async (invoiceData: Omit<Invoice, 'id'> & { id?: string }): Promise<Invoice> => {
    console.log('saveInvoiceWithGST called with data:', invoiceData);
    const now = new Date().toISOString();
    
    // Get the existing invoice data if this is an update
    let existingInvoice: Invoice | null = null;
    if (invoiceData.id) {
      console.log('Fetching existing invoice data for update');
      try {
        const docRef = doc(db, 'invoices', invoiceData.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existingInvoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
          console.log('Found existing invoice:', existingInvoice);
        }
      } catch (error) {
        console.error('Error fetching existing invoice:', error);
      }
    }
    
    // Prepare the updated invoice data
    const updatedInvoice = {
      ...(existingInvoice || {}), // Start with existing data if available
      ...invoiceData, // Apply all updates
      updatedAt: now,
      // Only set createdAt for new invoices
      ...(!invoiceData.id && { 
        createdAt: now,
        status: 'draft' as const,
        paidAmount: 0,
        paymentHistory: []
      })
    };
    
    console.log('Prepared updated invoice data:', updatedInvoice);
    
    try {
      // Save the invoice
      console.log('Saving invoice to database...');
      const docId = await saveInvoice(updatedInvoice);
      console.log('Invoice saved with ID:', docId);
      
      // Create the complete invoice object with the new ID
      const savedInvoice: Invoice = {
        ...updatedInvoice,
        id: docId
      };
      
      // Update GST record (don't await to prevent blocking the UI)
      console.log('Updating GST record...');
      updateGSTRecord(savedInvoice)
        .then(() => console.log('GST record update completed'))
        .catch(error => console.error('Error in GST record update:', error));
      
      return savedInvoice;
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    }
  }, [saveInvoice, updateGSTRecord]);

  const createInvoiceFromQuotation = useCallback(async (quotation: Quotation) => {
    const now = new Date()
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`

    const invoiceData: Omit<Invoice, "id"> = {
      invoiceNumber,
      invoiceDate: now.toISOString().split('T')[0],
      invoiceName: `Invoice for ${quotation.quotationNumber}`,
      companyName: quotation.companyName,
      companyEmail: quotation.companyEmail,
      companyPhone: quotation.companyPhone,
      companyAddress: quotation.companyAddress,
      companyLogo: quotation.companyLogo,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      status: 'draft',
      dueDate: dueDate.toISOString().split('T')[0],
      notes: quotation.notes,
      items: quotation.items.map((item) => ({
        id: item.id,
        title: item.title || '',
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
        sgstAmount: item.sgstAmount,
        cgstAmount: item.cgstAmount
      })),
      subtotal: quotation.subtotal,
      gstAmount: quotation.gstAmount,
      sgstAmount: quotation.sgstAmount,
      cgstAmount: quotation.cgstAmount,
      totalAmount: quotation.totalAmount,
      paymentHistory: [],
      paidAmount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    return saveInvoice(invoiceData)
  }, [saveInvoice])

  const addPayment = useCallback(async (id: string, paymentAmount: number, paymentDate: string, method = "Cash", notes?: string) => {
    const docRef = doc(db, 'invoices', id);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Invoice not found");
      }
      const invoice = docSnap.data() as Invoice;

      const currentPaidAmount = invoice.paidAmount || 0;
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const paymentHistory = invoice.paymentHistory || [];

      const newPayment = {
        id: `payment-${Date.now()}`,
        date: paymentDate,
        amount: paymentAmount,
        method,
        notes: notes || "",
      };

      let newStatus: Invoice["status"];
      if (newPaidAmount >= invoice.totalAmount) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partially_paid";
      } else {
        newStatus = invoice.status;
      }

      const updatedFields = {
        status: newStatus,
        paidAmount: newPaidAmount,
        paidDate: paymentDate,
        paymentHistory: [...paymentHistory, newPayment],
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docRef, updatedFields);

    } catch (err) {
      console.error("Error adding payment:", err);
      setApiError("Failed to add payment");
      throw err;
    }
  }, [])

  const markAsPaid = useCallback(async (id: string, paidAmount: number, paidDate: string) => {
    await addPayment(id, paidAmount, paidDate)
  }, [addPayment])

  const duplicateInvoice = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'invoices', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Invoice not found");
      }

      const invoice = { ...docSnap.data(), id: docSnap.id } as Invoice;
      const now = new Date();
      
      // Generate a new unique ID for the duplicated invoice
      const newInvoiceRef = doc(collection(db, 'invoices'));
      
      // Create a new invoice with updated fields
      const duplicatedInvoiceData: Invoice = {
        ...invoice,
        id: newInvoiceRef.id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${(invoices.length + 1).toString().padStart(4, '0')}`,
        invoiceName: `${invoice.invoiceName || invoice.invoiceNumber} (Copy)`,
        status: "draft" as const,
        paidAmount: 0,
        paymentHistory: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dueDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // 30 days from now
      };

      // Save the new invoice with the new ID
      await setDoc(newInvoiceRef, duplicatedInvoiceData);
      return newInvoiceRef.id;
    } catch (err) {
      console.error("Error duplicating invoice:", err);
      setApiError("Failed to duplicate invoice");
      return null;
    }
  }, [saveInvoice]);


  const getInvoice = useCallback((id: string) => {
    return invoices.find((inv) => inv.id === id)
  }, [invoices]);

  // Wrapper function to handle deletion with confirmation and associated GST records
  const handleDeleteInvoice = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return false;
    }

    try {
      // First, find and delete any associated GST records
      const gstRecordsQuery = query(
        collection(db, 'gstRecords'),
        where('invoiceId', '==', id)
      );
      
      const querySnapshot = await getDocs(gstRecordsQuery);
      
      // Delete all found GST records
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      // Then delete the invoice
      await deleteInvoice(id);
      
      return true;
    } catch (err) {
      console.error('Error deleting invoice and associated GST records:', err);
      setApiError('Failed to delete invoice and associated GST records');
      return false;
    }
  }, [deleteInvoice]);

  return {
    invoices,
    loading,
    error: error?.message || apiError,
    saveInvoice: saveInvoiceWithGST,
    deleteInvoice: handleDeleteInvoice,
    createInvoiceFromQuotation,
    addPayment,
    markAsPaid,
    duplicateInvoice,
    getInvoice,
  }
}
