import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { tapClient } from "@/lib/payments/tap";
import { stripeClient } from "@/lib/payments/stripe";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, params.id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.paymentStatus === "PAID") {
      // Redirect back to the invoice view if already paid
      return NextResponse.redirect(new URL(`/invoices/${invoice.id}`, req.url));
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, invoice.tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const returnUrl = `${baseUrl}/invoices/${invoice.id}`;

    if (tenant.paymentGateway === "STRIPE") {
      if (!tenant.stripeSecretKey) {
        return NextResponse.json({ error: "Stripe is not configured for this tenant" }, { status: 400 });
      }

      const session = await stripeClient.createCheckoutSession({
        secretKey: tenant.stripeSecretKey,
        amount: Number(invoice.totalAmount),
        currency: invoice.currencyCode || "SAR",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        returnUrl: returnUrl,
      });

      if (session.url) {
        return NextResponse.redirect(session.url);
      } else {
        return NextResponse.json({ error: "Could not create Stripe checkout" }, { status: 500 });
      }

    } else {
      // Default to TAP
      const tapSecret = tenant.tapSecretKey || process.env.TAP_SECRET_KEY || 'sk_test_XKokBfNWv6FIYuTMg5sLPsky';
      
      const chargePayload = {
        amount: Number(invoice.totalAmount),
        currency: invoice.currencyCode || "SAR",
        customer: {
          first_name: invoice.buyerName || "Customer",
        },
        source: { id: "src_all" },
        redirect: {
          url: returnUrl,
        },
        reference: {
          transaction: invoice.id,
          order: invoice.invoiceNumber,
        },
        post: {
          url: `${baseUrl}/api/v1/webhooks/tap`
        }
      };

      const charge = await tapClient.createCharge(chargePayload as any);
      return NextResponse.redirect(charge.transaction.url);
    }

  } catch (error: any) {
    console.error("Payment Redirection Error:", error);
    return NextResponse.json({ error: "Could not initialize payment" }, { status: 500 });
  }
}
