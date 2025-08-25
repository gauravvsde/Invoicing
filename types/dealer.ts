export interface Dealer {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealerInput = Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>;
