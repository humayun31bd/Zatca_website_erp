"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [billingCycle, setBillingCycle] = useState("annual");
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Read URL query params on mount (e.g. ?plan=free)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      if (planParam && ["free", "basic", "standard", "premium"].includes(planParam)) {
        setSelectedPlan(planParam);
      }
      const cycleParam = params.get("cycle");
      if (cycleParam && ["annual", "monthly", "halfYear"].includes(cycleParam)) {
        setBillingCycle(cycleParam);
      }
    }
  }, []);

  // Geo-IP State
  const [geoData, setGeoData] = useState<any>({
    region: "GCC",
    currency: "SAR",
    isBangladesh: false,
    isGCC: true,
    gateways: [
      { id: "tap_mada", name: "Mada Debit Card", type: "mada", icon: "💳" },
      { id: "tap_applepay", name: "Apple Pay", type: "applepay", icon: "🍎" },
      { id: "tap_card", name: "Credit Card (Visa / Mastercard)", type: "card", icon: "💳" },
    ],
  });
  const [selectedGateway, setSelectedGateway] = useState("tap_mada");

  useEffect(() => {
    // Auto-detect client location
    fetch("/api/v1/geo-location")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGeoData(data);
          if (data.gateways && data.gateways.length > 0) {
            setSelectedGateway(data.gateways[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const getSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const computedSubdomain = companyName
    ? `${getSlug(companyName)}.intelligentdive.com`
    : "your-company.intelligentdive.com";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          email,
          password,
          packagePlan: selectedPlan,
          billingCycle,
          paymentGateway: selectedPlan === "free" ? "none" : selectedGateway,
          currency: geoData.currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData(data.data);
        setStep(4); // Success screen
      } else {
        setErrorMsg(data.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Intelligent ERP
          </h1>
          <div className="mt-2 flex items-center justify-center space-x-2 text-xs">
            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
              📍 Location detected: <strong className="text-blue-400">{geoData.region} ({geoData.countryCode || "GCC"})</strong>
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? "text-blue-400 font-bold" : "text-slate-500"}`}>
              <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">1</span>
              <span>Account</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? "text-blue-400 font-bold" : "text-slate-500"}`}>
              <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">2</span>
              <span>Plan</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 3 ? "text-blue-400 font-bold" : "text-slate-500"}`}>
              <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">3</span>
              <span>{selectedPlan === "free" ? "Activate" : "Payment"}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Account Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Al-Khaleej Trading"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Your portal will be: <span className="text-blue-400 font-mono">{computedSubdomain}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              onClick={() => {
                if (companyName && email && password) setStep(2);
                else setErrorMsg("Please fill in all fields.");
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition"
            >
              Continue to Package Selection &rarr;
            </button>
          </div>
        )}

        {/* Step 2: Package Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setBillingCycle("annual")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  billingCycle === "annual" ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                Annual (Save 40%)
              </button>
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  billingCycle === "monthly" ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                Monthly
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: "free",
                  name: "Free",
                  price: "FREE Forever",
                  sub: "No Credit Card Required",
                  badge: "Zero Risk",
                },
                {
                  id: "basic",
                  name: "Basic",
                  price: geoData.isBangladesh
                    ? billingCycle === "annual" ? "BDT 55,000/yr" : "BDT 5,500/mo"
                    : billingCycle === "annual" ? "SAR 1,800/yr" : "SAR 180/mo",
                  sub: "Single Shop Retailer",
                },
                {
                  id: "standard",
                  name: "Standard",
                  price: geoData.isBangladesh
                    ? billingCycle === "annual" ? "BDT 180,000/yr" : "BDT 11,000/mo"
                    : billingCycle === "annual" ? "SAR 6,000/yr" : "SAR 360/mo",
                  sub: "Multi-branch & Restaurant",
                  popular: true,
                },
                {
                  id: "premium",
                  name: "Premium",
                  price: geoData.isBangladesh
                    ? billingCycle === "annual" ? "BDT 180,000/yr" : "BDT 18,000/mo"
                    : billingCycle === "annual" ? "SAR 6,000/yr" : "SAR 600/mo",
                  sub: "Enterprise & Chains",
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedPlan === p.id
                      ? "border-blue-500 bg-blue-950/30"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  {p.popular && <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded-full uppercase font-bold text-white mb-1 inline-block">Popular</span>}
                  {p.badge && <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full uppercase font-bold text-white mb-1 inline-block">{p.badge}</span>}
                  <h3 className="font-bold text-sm text-white">{p.name}</h3>
                  <p className="text-xs text-blue-400 mt-1 font-semibold">{p.price}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.sub}</p>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition"
              >
                &larr; Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition"
              >
                {selectedPlan === "free" ? "Activate Free Plan &rarr;" : "Select Payment Method &rarr;"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Activation / Payment Gateway */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Company:</span>
                <span className="font-semibold text-white">{companyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Selected Plan:</span>
                <span className="font-semibold text-emerald-400 uppercase">{selectedPlan} ({selectedPlan === "free" ? "Forever Free" : billingCycle})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Dedicated Portal:</span>
                <span className="font-mono text-blue-400">{computedSubdomain}</span>
              </div>
            </div>

            {selectedPlan === "free" ? (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 text-center space-y-2">
                <span className="text-3xl">🎉</span>
                <h3 className="font-bold text-emerald-400 text-base">No Payment Required</h3>
                <p className="text-xs text-slate-300">
                  You selected the <strong>Free Plan</strong>. Enjoy 300 e-invoices per month, full POS, inventory, and ZATCA Phase 2 compliance with zero credit card required.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Select {geoData.region} Payment Gateway ({geoData.currency})
                </label>
                <div className="space-y-2">
                  {geoData.gateways?.map((gw: any) => (
                    <div
                      key={gw.id}
                      onClick={() => setSelectedGateway(gw.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                        selectedGateway === gw.id
                          ? "border-blue-500 bg-blue-950/30"
                          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{gw.icon}</span>
                        <span className="font-semibold text-sm text-white">{gw.name}</span>
                      </div>
                      <span className="text-xs text-blue-400 uppercase font-bold">{gw.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-2/3 text-white font-semibold py-3.5 rounded-xl transition flex justify-center items-center ${
                  selectedPlan === "free"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                }`}
              >
                {isLoading ? "Processing..." : selectedPlan === "free" ? "Activate Free Account Now &rarr;" : `Pay in ${geoData.currency} & Activate`}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Success Notification */}
        {step === 4 && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto text-blue-400 text-3xl">
              ✉️
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Check Your Email to Activate Your Site
              </h2>
              <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                We sent a verification link to <strong className="text-white">{email}</strong>. Please click the link in your email to verify your address, activate your dedicated ERP instance, and receive your login credentials.
              </p>
              <div className="mt-4 inline-block bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 font-mono text-blue-400 text-sm">
                https://{successData?.subdomain}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <a
                href={successData?.confirmEmailUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
              >
                Simulate Email Verification Link &rarr;
              </a>
            </div>
          </div>
        )}

        {/* Footer Link */}
        {step < 4 && (
          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:underline">
              Log in here
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
