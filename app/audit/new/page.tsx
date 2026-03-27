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
      console.log("Submitting audit form:", form);

      const res = await fetch("/api/run-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      console.log("run-audit status:", res.status);

      const data = await res.json();
      console.log("run-audit response:", data);

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
            Your website is losing leads right now.
            <br />
            This will show you where.
          </h1>

          <p className="text-lg text-gray-300">
            Most businesses don’t lose leads because of traffic.
            <br />
            They lose them because no one responds fast enough.
          </p>

          <p className="text-gray-400">
            We scan your website for missed enquiries, slow response risks, and
            broken follow-up systems — so you can see exactly where revenue is
            being lost.
          </p>

          <div className="space-y-3 pt-4">
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ Lead capture issues across key pages
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ Missed enquiry and response gaps
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ CRM and automation readiness signals
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-gray-800">
              ✔ Estimated revenue at risk
            </div>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            Takes 30–60 seconds. No login required.
          </div>

          <div className="pt-2 text-sm text-gray-400">
            Used by service businesses to uncover missed revenue from existing
            enquiries.
          </div>
        </div>

        <div className="bg-[#020617] border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-semibold mb-2">Run your audit</h2>

          <p className="text-gray-400 mb-6">
            Enter your details and get your results instantly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={form.name}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="text"
              name="business"
              placeholder="Business name"
              value={form.business}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="url"
              name="website"
              placeholder="https://yourwebsite.com"
              value={form.website}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 font-semibold text-lg hover:opacity-90 transition disabled:opacity-70"
            >
              {loading ? "Running Audit..." : "Show Me My Results"}
            </button>
          </form>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <p className="text-xs text-gray-500 mt-4 text-center">
            Your report will open instantly after the audit completes.
          </p>
        </div>
      </div>
    </div>
  );
}