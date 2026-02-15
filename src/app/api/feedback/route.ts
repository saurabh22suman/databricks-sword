/**
 * @file route.ts
 * @description API route for handling feedback form submissions via SMTP.
 */

import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "feedback"]),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  email: z.string().email().optional().or(z.literal("")),
})

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, subject, message, email } = parsed.data

    // Check SMTP configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser
    const feedbackTo = process.env.FEEDBACK_TO

    if (!smtpHost || !smtpUser || !smtpPass || !feedbackTo) {
      console.error("SMTP not configured. Missing env vars.")
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Format type label
    const typeLabels: Record<string, string> = {
      bug: "🐛 Bug Report",
      feature: "✨ Feature Request",
      feedback: "💬 General Feedback",
    }

    // Build email content
    const htmlContent = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a0a0f 0%, #12121a 100%); padding: 24px; border-radius: 8px;">
          <h1 style="color: #ff3366; margin: 0 0 8px 0; font-size: 24px;">
            ${typeLabels[type]}
          </h1>
          <h2 style="color: #ffffff; margin: 0 0 24px 0; font-size: 18px;">
            ${subject}
          </h2>
          <div style="background: #1a1a24; padding: 16px; border-radius: 4px; border-left: 3px solid #00ffff;">
            <p style="color: #e0e0e0; margin: 0; white-space: pre-wrap; line-height: 1.6;">
              ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
            </p>
          </div>
          ${
            email
              ? `<p style="color: #888; margin-top: 16px; font-size: 14px;">
                  Reply to: <a href="mailto:${email}" style="color: #00ffff;">${email}</a>
                </p>`
              : ""
          }
          <hr style="border: none; border-top: 1px solid #2a2a3a; margin: 24px 0;" />
          <p style="color: #666; font-size: 12px; margin: 0;">
            Sent from Databricks Sword Feedback Form
          </p>
        </div>
      </div>
    `

    const textContent = `
${typeLabels[type]}

Subject: ${subject}

${message}

${email ? `Reply to: ${email}` : "No reply email provided"}

---
Sent from Databricks Sword Feedback Form
    `.trim()

    // Send email
    await transporter.sendMail({
      from: smtpFrom,
      to: feedbackTo,
      subject: `[Databricks Sword] ${typeLabels[type]}: ${subject}`,
      text: textContent,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback submission error:", error)
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    )
  }
}
