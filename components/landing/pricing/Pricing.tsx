// components/pricing/pricing-section.tsx
import { headers } from "next/headers";
import { resolveCountryCode } from "@/lib/geo";
import { regionFromCountryCode, PRO_DISPLAY_PRICING } from "@/lib/pricing";
import { PricingClient } from "./pricing-client";

export async function Pricing() {
  const headersList = await headers();
  const countryCode = await resolveCountryCode(headersList);
  const region = regionFromCountryCode(countryCode);
  const proPricing = PRO_DISPLAY_PRICING[region];


  return <PricingClient />;
}