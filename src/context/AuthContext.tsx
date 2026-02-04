import React, { createContext, ReactNode, useContext, useEffect, useReducer, useState } from 'react';
import apiService from '../services/api';
import { AuthState, User } from '../types';

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from storage on app start
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        console.log('🔄 [AUTH] Restoring auth state from storage...');
        
        // Check if auth data is valid (not expired)
        const isValid = await apiService.isAuthDataValid().catch((err) => {
          console.warn('⚠️ [AUTH] Error checking auth validity:', err);
          return false;
        });
        
        if (!isValid) {
          console.log('ℹ️ [AUTH] No valid auth data found or token expired');
          setIsLoading(false);
          return;
        }

        // Get stored auth data
        const authData = await apiService.getStoredAuthData().catch((err) => {
          console.warn('⚠️ [AUTH] Error getting stored auth data:', err);
          return null;
        });
        
        if (authData && authData.token && authData.user) {
          console.log('✅ [AUTH] Valid auth data found, restoring session...');
          
          // Verify token with backend (with timeout to prevent hanging)
          const verification = await Promise.race([
            apiService.verifyToken(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token verification timeout')), 5000)
            )
          ]).catch((err) => {
            console.warn('⚠️ [AUTH] Token verification failed or timed out:', err);
            return { success: false };
          }) as any;
          
          if (verification && verification.success) {
            console.log('✅ [AUTH] Token verified, restoring auth state');
            dispatch({ 
              type: 'LOGIN', 
              payload: { 
                user: authData.user, 
                token: authData.token 
              } 
            });
            
            // Initialize auth headers (don't await, let it happen in background)
            apiService.initializeAuth().catch((err) => {
              console.warn('⚠️ [AUTH] Error initializing auth headers:', err);
            });
          } else {
            console.log('❌ [AUTH] Token verification failed, clearing auth data');
            await apiService.clearAuthData().catch((err) => {
              console.warn('⚠️ [AUTH] Error clearing auth data:', err);
            });
          }
        } else {
          console.log('ℹ️ [AUTH] No auth data found');
        }
      } catch (error) {
        console.error('❌ [AUTH] Error restoring auth state:', error);
        // Don't crash the app, just clear auth and continue
        try {
          await apiService.clearAuthData();
        } catch (clearError) {
          console.warn('⚠️ [AUTH] Error clearing auth data in catch:', clearError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);

  const login = (user: User, token: string) => {
    dispatch({ type: 'LOGIN', payload: { user, token } });
  };

  const logout = async () => {
    await apiService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 