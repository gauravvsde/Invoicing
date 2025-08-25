"use client"

import { useFirestore } from "./useFirestore"
import type { Dealer } from "@/types/dealer"

type DealerCollection = {
  dealers: Dealer[]
}

export function useDealers() {
  console.log('[useDealers] Initializing hook');
  const { 
    data: dealers = [], 
    loading, 
    error, 
    saveDocument, 
    deleteDocument 
  } = useFirestore<Dealer>('dealers' as const, {
    includeTimestamps: true
  });

  console.log('[useDealers] Dealers data:', { dealers, loading, error });

  const addDealer = async (dealer: Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('[useDealers] Adding new dealer:', dealer);
    try {
      const result = await saveDocument(dealer);
      console.log('[useDealers] Successfully added dealer:', result);
      return result;
    } catch (error) {
      console.error('[useDealers] Error adding dealer:', error);
      throw error;
    }
  };

  const removeDealer = async (id: string) => {
    return deleteDocument(id);
  };

  return {
    dealers,
    loading,
    error,
    addDealer,
    removeDealer
  };
}
