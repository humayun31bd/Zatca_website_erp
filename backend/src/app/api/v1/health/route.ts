import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: process.env.USE_MOCK_API === "true" ? "mock" : "live",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}
