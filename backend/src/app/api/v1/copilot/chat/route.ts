import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAllowed = await checkRateLimit(session.tenantId || "default_tenant");
    if (!isAllowed) {
      return NextResponse.json({ error: "Too Many Requests. AI Copilot is currently rate limited." }, { status: 429 });
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages array" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    // MVP Mock AI Response
    // In a real implementation, you would use @google/genai or another SDK here
    // e.g. const response = await genAI.generateContent(...)

    let aiResponse = "I'm the AI Financial Copilot. How can I help you today?";

    const text = lastMessage.content.toLowerCase();
    if (text.includes('invoice') || text.includes('sales')) {
      aiResponse = "I can see your invoices and sales data. Your total sales for today are SAR 4,500 across 12 invoices. Your VAT liability is SAR 675. Would you like me to generate a detailed report?";
    } else if (text.includes('tax') || text.includes('zatca')) {
      aiResponse = "All your invoices are successfully synced with the ZATCA portal (Phase 2). You have no pending clearance issues. Ensure you file your VAT return by the end of the month.";
    } else if (text.includes('stock') || text.includes('inventory')) {
      aiResponse = "You have 3 items running low on stock. 'Coffee Beans' is down to 5 units, which is below the minimum threshold of 10. Should I draft a purchase order?";
    } else if (text.length > 15) {
      aiResponse = "That's an interesting financial query! As a simulated AI for this MVP, I don't have a live connection to an LLM yet, but once connected, I'll be able to analyze that using your database records.";
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      success: true,
      message: {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('Copilot chat error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
