"use client"

import { useState, useCallback } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import { orderBy } from "firebase/firestore"
import type { Quotation } from "../types/quotation"
import { useFirestore } from "./useFirestore"

export function useQuotations() {
  const { 
    data: quotations, 
    loading, 
    error, 
    saveDocument: saveQuotation, 
    deleteDocument: deleteQuotation,
    queryDocuments
  } = useFirestore<Quotation>('quotations', {
    queryConstraints: [orderBy('createdAt', 'desc')],
    includeTimestamps: true
  })

  const [apiError, setApiError] = useState<string | null>(null)

  const duplicateQuotation = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'quotations', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Quotation not found");
      }

      const quotation = docSnap.data() as Quotation;
      const now = new Date();
      const newQuotationNumber = `QT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${(quotations.length + 1).toString().padStart(4, '0')}`;
      
      // Create a new quotation with updated fields
      const newQuotationData: Omit<Quotation, 'id'> = {
        ...quotation,
        quotationNumber: newQuotationNumber,
        quotationName: `${quotation.quotationName || quotation.quotationNumber} (Copy)`,
        status: "draft" as const,
        validUntil: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 30 days from now
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        items: quotation.items.map(item => ({
          ...item,
          id: Math.random().toString(36).substring(2, 9) // Generate new IDs for items
        }))
      };

      return saveQuotation(newQuotationData);
    } catch (err) {
      console.error("Error duplicating quotation:", err);
      setApiError("Failed to duplicate quotation");
      return null;
    }
  }, [saveQuotation]);


  const getQuotation = useCallback((id: string) => {
    return quotations.find((q) => q.id === id)
  }, [quotations])

  // Wrapper function to handle deletion with confirmation
  const handleDeleteQuotation = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      try {
        await deleteQuotation(id);
        return true;
      } catch (err) {
        console.error('Error deleting quotation:', err);
        setApiError('Failed to delete quotation');
        return false;
      }
    }
    return false;
  }, [deleteQuotation]);

  return {
    quotations,
    loading,
    error: error?.message || apiError,
    saveQuotation,
    deleteQuotation: handleDeleteQuotation,
    getQuotation,
    duplicateQuotation,
  }
}
