"use client";
import { ReactNode } from "react";
import { AuthProvider } from "../helpers/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute “fresh” window
    },
  },
});

export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <ScrollToHashElement />
        <TooltipProvider>
          <AuthProvider>{children}</AuthProvider>
          <SonnerToaster />
        </TooltipProvider>
      </>
    </QueryClientProvider>
  );
};

