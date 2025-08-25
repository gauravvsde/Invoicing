"use client"

import { useState, useCallback } from "react"
import { getDoc, deleteDoc, where, query, getDocs } from "firebase/firestore"
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

      const invoice = docSnap.data() as Invoice;
      const now = new Date();
      const newInvoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${(invoices.length + 1).toString().padStart(4, '0')}`;
      
      // Create a new invoice with updated fields
      const duplicatedInvoiceData: Omit<Invoice, 'id'> = {
        ...invoice,
        invoiceNumber: newInvoiceNumber,
        invoiceName: `${invoice.invoiceName || invoice.invoiceNumber} (Copy)`,
        status: "draft" as const,
        paidAmount: 0,
        paymentHistory: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dueDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // 30 days from now
      };

      return saveInvoice(duplicatedInvoiceData);
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
    saveInvoice,
    deleteInvoice: handleDeleteInvoice,
    createInvoiceFromQuotation,
    addPayment,
    markAsPaid,
    duplicateInvoice,
    getInvoice,
  }
}
