import { createContext } from 'react';
import type { User } from '../types';

interface AuthContextValue {
    user: User | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
