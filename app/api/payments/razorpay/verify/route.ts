// app/api/payments/razorpay/verify/route.ts
//
// Forwards the Checkout response to the main backend's
// POST /Payment/verify-payment, which recomputes the HMAC signature against
// the Order record it created, marks the order paid/verified, and grants the
// membership. This route holds no Razorpay secret and does no verification
// itself — the backend is the single source of truth for order state.
import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKENDBASEURL;

export async function POST(req: NextRequest) {
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!BACKEND_BASE_URL) {
    console.error("NEXT_PUBLIC_BACKENDBASEURL is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const backendRes = await fetch(`${BACKEND_BASE_URL}/Payment/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    });

    const data = await backendRes.json().catch(() => null);

    if (!backendRes.ok || !data?.success) {
      console.error("Backend failed to verify payment:", backendRes.status, data);
      return NextResponse.json(
        { error: data?.message ?? "Payment verification failed" },
        { status: backendRes.status === 401 ? 401 : 502 }
      );
    }
  } catch (error) {
    console.error("Backend verification request error:", error);
    return NextResponse.json({ error: "Payment verified but activation failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
