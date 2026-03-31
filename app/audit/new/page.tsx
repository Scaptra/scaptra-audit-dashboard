"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuditForm = {
  name: string;
  business: string;
  website: string;
  email: string;
  phone: string;
};

export default function AuditPage() {
  const router = useRouter();

  const [form, setForm] = useState<AuditForm>({
    name: "",
    business: "",
    website: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/run-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to run audit");
      }

      const redirectId = data?.reportId || data?.id || data?.auditId;

      if (!redirectId) {
        throw new Error("Audit completed but no report ID was returned.");
      }

      router.push(`/audit/${redirectId}`);
    } catch (error) {
      console.error("Audit submit error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while running the audit."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="text-sm uppercase tracking-widest text-blue-400 font-bold">
            Scaptra Audit
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            You’re losing leads every day.
            <br />
            This shows you exactly where.
          </h1>

          <p className="text-lg text-gray-300">
            Most businesses don’t have a traffic problem.
            <br />
            They have a response problem.
          </p>

          <p className="text-gray-400 text-base md:text-lg leading-8">
            We scan your website and enquiry pathways to show where leads may be
            slipping through — before missed calls, weak follow-up, and slow
            response times quietly turn into lost revenue.
          </p>

          <div className="space-y-3 pt-4">
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ Where enquiries are being missed
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ How fast — or slow — you respond
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ Where follow-up is breaking down
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ How much revenue may be at risk
            </div>
          </div>

          <div className="pt-4 text-sm text-gray-400">
            Used by service businesses to recover missed enquiries and increase
            booked jobs.
          </div>
        </div>

        <div className="bg-[#020617] border border-gray-800 rounded-2xl p-8 shadow-xl">
          <div className="inline-block text-xs font-semibold uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-400/20 rounded-full px-3 py-1 mb-4">
            Free audit — no sales pitch, just results
          </div>

          <h2 className="text-2xl font-semibold mb-2">Run your audit</h2>

          <p className="text-gray-400 mb-6">
            Enter your details and see what may be costing you leads.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={form.name}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none focus:border-blue-400"
            />

            <input
              type="text"
              name="business"
              placeholder="Business name"
              value={form.business}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none focus:border-blue-400"
            />

            <input
  type="text"
  inputMode="url"
  name="website"
  placeholder="yourwebsite.com"
  value={form.website}
  required
  onChange={handleChange}
  className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none focus:border-blue-400"
/>

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none focus:border-blue-400"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none focus:border-blue-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 font-semibold text-lg hover:opacity-90 transition disabled:opacity-70"
            >
              {loading ? "Running Audit..." : "Show Me My Lost Leads"}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Takes 30–60 seconds. No login required.
          </p>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Your report will open instantly after the audit completes.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}