
"use client";

import { useState } from "react";

type Props = {
  reportId: string;
};

export default function RequestFullReportButton({ reportId }: Props) {
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function requestReport() {
    if (status === "sending" || status === "success") return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/request-full-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to send your report right now."
        );
      }

      setStatus("success");
      setMessage(
        "Your full report has been requested. Please check the email address you provided."
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={requestReport}
        disabled={status === "sending" || status === "success"}
        className="w-full rounded-xl bg-sky-500 px-5 py-3.5 text-center text-base font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "sending"
          ? "Sending your report..."
          : status === "success"
            ? "Report Requested"
            : "Get My Free Full Report"}
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-sm ${
            status === "error" ? "text-red-300" : "text-green-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
