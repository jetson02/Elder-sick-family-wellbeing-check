import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LoginCredentials, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Fetch current user
  const { 
    data: user, 
    isLoading,
    refetch,
    error
  } = useQuery<User | null>({ 
    queryKey: ['/api/auth/me'],
    retry: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Set auth initialized when query settles
  useEffect(() => {
    if (!isLoading) {
      setAuthInitialized(true);
    }
  }, [isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        const response = await apiRequest('POST', '/api/auth/login', credentials);
        
        if (!response.ok) {
          // Handle specific HTTP error codes
          if (response.status === 401) {
            throw new Error("Invalid username or password");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Login failed");
          }
        }
        
        return await response.json();
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: async (userData) => {
      console.log("Login successful, user data:", userData);
      
      // Force refetch user data
      await refetch();
      
      // Ensure we have the latest user data before redirecting
      console.log("Login successful in auth provider, redirecting to home");
      
      // Show toast before navigation
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Use a stronger approach to force navigation with absolute URLs
      // which works better on mobile browsers
      setTimeout(() => {
        const baseUrl = window.location.origin;
        console.log("Auth provider forcing redirect to:", baseUrl + '/');
        window.location.replace(baseUrl + '/');
      }, 500);
    },
    onError: (error: Error) => {
      // Filter out common browser security messages
      const errorMessage = error.message.includes("compromised") 
        ? "Login failed. Please try again." 
        : error.message;
        
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      refetch();
      setLocation('/login');
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Debug auth state changes
  useEffect(() => {
    console.log("Auth state:", { 
      user, 
      isLoading, 
      error, 
      authInitialized,
      pathname: window.location.pathname
    });
  }, [user, isLoading, error, authInitialized]);

  // Auth context value
  const contextValue: AuthContextType = {
    user: user || null,
    isLoading: isLoading || !authInitialized,
    isAuthenticated: !!user,
    login: async (credentials) => {
      await loginMutation.mutateAsync(credentials);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    }
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}