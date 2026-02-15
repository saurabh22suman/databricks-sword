"use client"

/**
 * @file page.tsx
 * @description Feedback/Bug Report/Feature Request form page.
 */

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState } from "react"

type FeedbackType = "bug" | "feature" | "feedback"

interface FormState {
  type: FeedbackType
  subject: string
  message: string
  email: string
}

export default function FeedbackPage(): React.ReactElement {
  const [form, setForm] = useState<FormState>({
    type: "feedback",
    subject: "",
    message: "",
    email: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit feedback")
      }

      setStatus("success")
      setForm({ type: "feedback", subject: "", message: "", email: "" })
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const typeOptions: { value: FeedbackType; label: string; icon: string; description: string }[] = [
    { value: "bug", label: "Bug Report", icon: "🐛", description: "Report something that's broken" },
    { value: "feature", label: "Feature Request", icon: "✨", description: "Suggest a new feature" },
    { value: "feedback", label: "General Feedback", icon: "💬", description: "Share your thoughts" },
  ]

  return (
    <div className="min-h-screen bg-anime-950 text-white pt-24 pb-16">
      <div className="grain-overlay opacity-50" />
      <div className="fixed inset-0 bg-cyber-grid bg-[size:40px_40px] opacity-10 pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-black text-white mb-4">
            Send <span className="text-anime-cyan">Transmission</span>
          </h1>
          <p className="text-anime-400 text-lg">
            Report bugs, request features, or share your feedback.
          </p>
        </div>

        {status === "success" ? (
          <div className="cut-corner bg-anime-green/10 border border-anime-green p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="font-heading text-2xl text-anime-green mb-2">
              Transmission Received
            </h2>
            <p className="text-anime-400 mb-6">
              Thank you for your feedback! We&apos;ll review it soon.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setStatus("idle")}
                variant="outline"
              >
                Send Another
              </Button>
              <Link href="/">
                <Button variant="primary">Return Home</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-anime-300 mb-3">
                Transmission Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: opt.value })}
                    className={cn(
                      "cut-corner p-4 text-left transition-all",
                      "border bg-anime-900 hover:bg-anime-800",
                      form.type === opt.value
                        ? "border-anime-cyan shadow-neon-cyan"
                        : "border-anime-700 hover:border-anime-600"
                    )}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="font-medium text-white text-sm">{opt.label}</div>
                    <div className="text-xs text-anime-500">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-anime-300 mb-2">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your feedback"
                className={cn(
                  "w-full px-4 py-3 rounded-sm",
                  "bg-anime-900 border border-anime-700",
                  "text-white placeholder:text-anime-600",
                  "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
                  "transition-colors"
                )}
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-anime-300 mb-2">
                Message
              </label>
              <textarea
                id="message"
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your feedback in detail..."
                className={cn(
                  "w-full px-4 py-3 rounded-sm resize-y min-h-[150px]",
                  "bg-anime-900 border border-anime-700",
                  "text-white placeholder:text-anime-600",
                  "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
                  "transition-colors"
                )}
              />
              <p className="text-xs text-anime-600 mt-1">
                {form.message.length}/5000 characters
              </p>
            </div>

            {/* Email (optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-anime-300 mb-2">
                Your Email <span className="text-anime-600">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="For follow-up if needed"
                className={cn(
                  "w-full px-4 py-3 rounded-sm",
                  "bg-anime-900 border border-anime-700",
                  "text-white placeholder:text-anime-600",
                  "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
                  "transition-colors"
                )}
              />
            </div>

            {/* Error Message */}
            {status === "error" && (
              <div className="p-4 bg-anime-accent/10 border border-anime-accent rounded-sm text-anime-accent text-sm">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={status === "loading"}
                className="min-w-[200px]"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span>
                    Sending...
                  </span>
                ) : (
                  "Send Transmission"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-anime-500 hover:text-anime-cyan transition-colors text-sm">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}
