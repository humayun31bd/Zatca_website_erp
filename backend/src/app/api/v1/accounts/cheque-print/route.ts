import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

interface BankChequePreset {
  bankCode: string;
  bankName: string;
  widthMm: number;
  heightMm: number;
  datePosition: { topMm: number; leftMm: number };
  payeePosition: { topMm: number; leftMm: number };
  amountWordsPosition: { topMm: number; leftMm: number; maxWidthMm: number };
  amountFiguresPosition: { topMm: number; leftMm: number };
  acPayeeStampPosition: { topMm: number; leftMm: number };
}

const BANK_PRESETS: Record<string, BankChequePreset> = {
  AL_RAJHI: {
    bankCode: "AL_RAJHI",
    bankName: "Al Rajhi Bank (مصرف الراجحي)",
    widthMm: 210,
    heightMm: 90,
    datePosition: { topMm: 12, leftMm: 160 },
    payeePosition: { topMm: 28, leftMm: 35 },
    amountWordsPosition: { topMm: 42, leftMm: 35, maxWidthMm: 110 },
    amountFiguresPosition: { topMm: 42, leftMm: 155 },
    acPayeeStampPosition: { topMm: 10, leftMm: 20 },
  },
  SNB: {
    bankCode: "SNB",
    bankName: "Saudi National Bank / AlAhli (البنك الأهلي السعودي)",
    widthMm: 210,
    heightMm: 92,
    datePosition: { topMm: 14, leftMm: 158 },
    payeePosition: { topMm: 30, leftMm: 38 },
    amountWordsPosition: { topMm: 44, leftMm: 38, maxWidthMm: 108 },
    amountFiguresPosition: { topMm: 44, leftMm: 154 },
    acPayeeStampPosition: { topMm: 12, leftMm: 22 },
  },
  RIYAD: {
    bankCode: "RIYAD",
    bankName: "Riyad Bank (بنك الرياض)",
    widthMm: 210,
    heightMm: 90,
    datePosition: { topMm: 13, leftMm: 162 },
    payeePosition: { topMm: 29, leftMm: 36 },
    amountWordsPosition: { topMm: 43, leftMm: 36, maxWidthMm: 112 },
    amountFiguresPosition: { topMm: 43, leftMm: 156 },
    acPayeeStampPosition: { topMm: 11, leftMm: 25 },
  },
  SABB: {
    bankCode: "SABB",
    bankName: "Saudi Awwal Bank / SABB (البنك الأول)",
    widthMm: 210,
    heightMm: 90,
    datePosition: { topMm: 12, leftMm: 160 },
    payeePosition: { topMm: 28, leftMm: 34 },
    amountWordsPosition: { topMm: 42, leftMm: 34, maxWidthMm: 110 },
    amountFiguresPosition: { topMm: 42, leftMm: 155 },
    acPayeeStampPosition: { topMm: 10, leftMm: 20 },
  },
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const bankCode = req.nextUrl.searchParams.get("bankCode");

    if (bankCode && BANK_PRESETS[bankCode]) {
      return NextResponse.json({
        success: true,
        preset: BANK_PRESETS[bankCode],
      });
    }

    return NextResponse.json({
      success: true,
      presets: Object.values(BANK_PRESETS),
    });
  } catch (error: any) {
    console.error("GET Cheque Print Layout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
