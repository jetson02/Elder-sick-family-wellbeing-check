import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading, user, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("User already authenticated, redirecting to home");
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Clean up any extra spaces or special characters that might be causing problems
      const cleanedValues = {
        username: values.username.trim(),
        password: values.password  // Don't trim passwords as they might contain spaces
      };
      
      console.log("Attempting login with:", cleanedValues.username);
      
      // Try direct API request with server-side redirect for mobile
      try {
        // Make a direct fetch to bypass the auth hook and use server-side redirect
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Redirect-After-Login': 'true'
          },
          body: JSON.stringify(cleanedValues),
          redirect: 'follow',
          credentials: 'include'
        });
        
        // If we get here, the server-side redirect didn't happen
        console.log("Server redirect failed, trying client-side fallback");
        
        // Fallback to standard login procedure
        await login(cleanedValues);
        
        // Force a full page reload to the home URL as last resort
        const baseUrl = window.location.origin;
        window.location.replace(baseUrl + '/');
      } catch (redirectError) {
        // If there's a network error during redirect, fallback to standard login
        console.log("Error during redirect attempt:", redirectError);
        await login(cleanedValues);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("compromised")) {
          // Handle specific browser security warnings about compromised passwords
          setError("Login failed. Please try again.");
          console.log("Password was flagged by browser security. Using generic error message.");
        } else {
          setError(error.message);
        }
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-light">
      <Card className="w-full max-w-md bg-white rounded-xl shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary mb-2">Family Connect</h1>
            <p className="text-neutral-dark">Stay connected with your loved ones</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-white text-xl font-medium py-6 rounded-lg hover:bg-opacity-90 transition"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <a href="#" className="text-primary font-medium">
              Forgot password?
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
