// lib/services.ts

import { api } from "./Api";

export interface PlanFeature {
  featureId: string;
  featureKey: string;
  enabled: boolean;
  limit: number;
}

export interface MemberPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  tokenLimit: number;
  dailyTokenLimit: number;
  planFeatures: PlanFeature[];
  providerPlans: any[]
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GetMemberPlansResponse {
  message: string;
  data: {
    PlanList: MemberPlan[];
  };
}

export function GetMemberPlans() {
  return api.get<GetMemberPlansResponse>("/MShip/plan");
}

export function grantFreePlan(planId: string) {
  return api.post("/Payment/grant-free-plan", { planId });
}

export interface OrderPriceBreakdown {
  baseAmount: number; // paise
  convenienceFee: number; // paise
  gstAmount: number; // paise
  gstPercent: number;
  convenienceFeePercent: number;
  totalAmount: number; // paise — the amount actually charged
  currency: string;
}

export interface OrderSummaryResponse {
  success: boolean;
  plan: {
    _id: string;
    name: string;
    description?: string;
    durationDays: number;
  };
  breakdown: OrderPriceBreakdown;
}

// Pre-payment price breakdown (base price + convenience fee + GST) for the
// checkout page. Mirrors exactly what createOrder will charge — same backend
// util computes both, so these numbers never drift from what Razorpay bills.
export function getOrderSummary(planId: string) {
  return api.get<OrderSummaryResponse>(`/Payment/order-summary/${planId}`);
}