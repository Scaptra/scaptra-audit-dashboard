"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuditPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    business: "",
    website: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/run-audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data?.id) {
      router.push(`/audit/${data.id}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10">

        {/* LEFT SIDE */}
        <div className="space-y-6">

          <div className="text-sm uppercase tracking-widest text-blue-400 font-bold">
            Scaptra Audit
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Your website is losing leads right now.
            <br /> This will show you where.
          </h1>

          <p className="text-lg text-gray-300">
            Most businesses don’t lose leads because of traffic.
            <br />
            They lose them because no one responds fast enough.
          </p>

          <p className="text-gray-400">
            We scan your website for missed enquiries, slow response risks, and broken follow-up systems — so you can see exactly where revenue is being lost.
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
            Used by service businesses to uncover missed revenue from existing enquiries.
          </div>

        </div>

        {/* RIGHT SIDE FORM */}
        <div className="bg-[#020617] border border-gray-800 rounded-2xl p-8 shadow-xl">

          <h2 className="text-2xl font-semibold mb-2">
            Run your audit
          </h2>

          <p className="text-gray-400 mb-6">
            Enter your details and get your results instantly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="text"
              name="name"
              placeholder="Your name"
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="text"
              name="business"
              placeholder="Business name"
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="url"
              name="website"
              placeholder="https://yourwebsite.com"
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional)"
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-[#020617] border border-gray-700 focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 font-semibold text-lg hover:opacity-90 transition"
            >
              {loading ? "Running Audit..." : "Show Me My Results"}
            </button>

          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Your report will also be sent to your email.
          </p>

        </div>

      </div>
    </div>
  );
}