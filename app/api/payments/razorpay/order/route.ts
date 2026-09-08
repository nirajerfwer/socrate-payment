// app/api/payments/razorpay/order/route.ts
//
// Proxies order creation to the main backend (F:\all.ai_new\all-ai\backend),
// which owns Razorpay credentials, the Order/MembershipPlan records, and
// auth (via the forwarded session cookie). This route does no business logic
// of its own — it just forwards the request and relays the response.
import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKENDBASEURL;

export async function POST(req: NextRequest) {
  let body: { planId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { planId } = body;
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  if (!BACKEND_BASE_URL) {
    console.error("NEXT_PUBLIC_BACKENDBASEURL is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    // Backend's /Payment/create-order looks up the MembershipPlan by its
    // Mongo _id, creates the Razorpay order, persists an Order record, and
    // returns { success, order, key_id }. planId here must be that _id.
    const backendRes = await fetch(`${BACKEND_BASE_URL}/Payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ planId }),
    });

    const data = await backendRes.json().catch(() => null);

    if (!backendRes.ok || !data?.success) {
      console.error("Backend failed to create order:", backendRes.status, data);
      return NextResponse.json(
        { error: data?.message ?? "Failed to create order" },
        { status: backendRes.status === 401 ? 401 : 502 }
      );
    }

    return NextResponse.json({ order: data.order, keyId: data.key_id, breakdown: data.breakdown });
  } catch (error) {
    console.error("Backend order creation request error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 502 });
  }
}
