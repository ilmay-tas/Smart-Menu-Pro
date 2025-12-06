export interface Restaurant {
  id: number;
  name: string;
  address: string;
  details: string | null;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role: 'owner' | 'waiter' | 'kitchen';
  is_approved: boolean;
  restaurant_id: number | null;
  restaurant_name: string | null;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  restaurant_id: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
