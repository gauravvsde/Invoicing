import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  FirestoreError,
  Query
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type CollectionPath = 'invoices' | 'quotations' | 'gstRecords' | 'gstReturns' | 'dealers';

interface UseFirestoreOptions {
  queryConstraints?: QueryConstraint[];
  includeTimestamps?: boolean;
}

export function useFirestore<T extends { id?: string }>(
  collectionPath: CollectionPath,
  options: UseFirestoreOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { queryConstraints = [], includeTimestamps = true } = options;

  // Helper to parse document data
  const parseDocument = useCallback((doc: QueryDocumentSnapshot): T => {
    const data = doc.data();
    // Convert Firestore timestamps to ISO strings
    const processedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (value && typeof value === 'object' && 'toDate' in value) {
          return [key, value.toDate().toISOString()];
        }
        return [key, value];
      })
    );
    return { id: doc.id, ...processedData } as T;
  }, []);

  const { user } = useAuth();

  // Subscribe to collection changes
  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!user) {
      console.log('[useFirestore] User not authenticated, skipping subscription');
      setData([]);
      setLoading(false);
      return;
    }

    console.log(`[useFirestore] Subscribing to collection: ${collectionPath}`);
    setLoading(true);
    
    const collectionRef = collection(db, collectionPath);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints) 
      : query(collectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[useFirestore] Received ${snapshot.size} documents from ${collectionPath}`);
        if (snapshot.size === 0) {
          console.log(`[useFirestore] No documents found in ${collectionPath}`);
        }
        const items = snapshot.docs.map(parseDocument);
        setData(items);
        setLoading(false);
      },
      (error) => {
        console.error(`[useFirestore] Error in ${collectionPath} subscription:`, error);
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      console.log(`[useFirestore] Unsubscribing from ${collectionPath}`);
      unsubscribe();
    };
  }, [collectionPath, JSON.stringify(queryConstraints), parseDocument, user]);

  // Get a document by ID
  const getDocument = useCallback(async (id: string): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionPath, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return parseDocument(docSnap);
      }
      return null;
    } catch (err) {
      console.error(`Error getting document:`, err);
      setError(err as FirestoreError);
      return null;
    }
  }, [collectionPath, parseDocument]);

  // Add or update a document
  const saveDocument = useCallback(async (document: Partial<T>): Promise<string> => {
    try {
      const timestamp = serverTimestamp();
      const documentData = JSON.parse(JSON.stringify(document));
      
      if (includeTimestamps) {
        if (document.id) {
          documentData.updatedAt = timestamp;
        } else {
          documentData.createdAt = timestamp;
          documentData.updatedAt = timestamp;
        }
      }

      if (document.id) {
        // Update existing document
        const docRef = doc(db, collectionPath, document.id);
        await updateDoc(docRef, documentData);
        return document.id;
      } else {
        // Add new document
        const docRef = await addDoc(collection(db, collectionPath), documentData);
        return docRef.id;
      }
    } catch (err) {
      console.error(`Error saving document:`, err);
      setError(err as FirestoreError);
      throw err;
    }
  }, [collectionPath, includeTimestamps]);

  // Delete a document
  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, collectionPath, id));
    } catch (err) {
      console.error(`Error deleting document:`, err);
      setError(err as FirestoreError);
      throw err;
    }
  }, [collectionPath]);

  // Query documents with custom constraints
  const queryDocuments = useCallback(async (constraints: QueryConstraint[] = []): Promise<T[]> => {
    try {
      const q = query(collection(db, collectionPath), ...constraints);
      console.log(`[useFirestore] Created query for ${collectionPath} with constraints:`, constraints);
      const querySnapshot = await getDocs(q);
      console.log(`[useFirestore] Received ${querySnapshot.size} documents from ${collectionPath}`);
      if (querySnapshot.size === 0) {
        console.log(`[useFirestore] No documents found in ${collectionPath}`);
      }
      return querySnapshot.docs.map(parseDocument);
    } catch (err) {
      console.error(`Error querying documents:`, err);
      setError(err as FirestoreError);
      throw err;
    }
  }, [collectionPath, parseDocument]);

  return {
    data,
    loading,
    error,
    getDocument,
    saveDocument,
    deleteDocument,
    queryDocuments,
  };
}

export default useFirestore;
