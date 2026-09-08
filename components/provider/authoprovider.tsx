"use client";

import { GoogleUserInfo, LogOutUser } from "@/lib/userinfo_service";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface UserInfo {
  picture: string;
  name: string;
  email?: string;
}

export interface PlanInfo {
  planId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  dailyTokenLimit?: number;
  planFeatures?: {
    featureId: string;
    featureKey: string;
    enabled: boolean;
    limit?: number;
  }[];
}

export interface MembershipInfo {
  membershipId: string;
  status: "active" | "cancelled" | "expired" | "trial" | "pending";
  tokenLimit: number;
  tokensUsed: number;
  tokensRemaining: number;
  startDate: string;
  endDate?: string;
  isAutoRenew: boolean;
  plan: PlanInfo | null;
}

interface UserContextValue {
  userInfo: UserInfo | null;
  membership: MembershipInfo | null;
  isLoading: boolean;
  /** Re-fetch user + membership from the backend. */
  refresh: () => Promise<void>;
  /** Sign the user out and clear local state. */
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: any = await GoogleUserInfo();
      setUserInfo(data.user);
      setMembership(data.membership ?? null);
    } catch {
      setUserInfo(null);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await LogOutUser();
    } finally {
      setUserInfo(null);
      setMembership(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserContext.Provider
      value={{ userInfo, membership, isLoading, refresh, logout }}
    >
      {children}
    </UserContext.Provider>
  );
}

/** Access the current user + membership. Must be used within <UserProvider>. */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a <UserProvider>");
  }
  return ctx;
}