import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getServerEnv } from "@/lib/env"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const hintRequestSchema = z.object({
  challengeType: z.enum(["free-text", "fill-blank", "quiz"]),
  prompt: z.string().max(12000).optional().default(""),
  learnerInput: z.string().max(12000).optional(),
})

const GROQ_TIMEOUT_MS = 5000
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"

function parseFallbackModels(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
}

function buildHintPrompt(input: z.infer<typeof hintRequestSchema>): string {
  const learnerInput = input.learnerInput?.trim()
  const safeLearnerInput = learnerInput ? learnerInput.slice(0, 1200) : ""

  return [
    "You are a concise educational hint generator.",
    "Rules:",
    "- Give only a hint, never the full solution or final answer.",
    "- Keep response under 80 words.",
    "- Focus on conceptual guidance and debugging direction.",
    "- If the request is ambiguous, ask one clarifying question.",
    "- Do not mention confidence or probability.",
    "",
    `Challenge type: ${input.challengeType}`,
    "Challenge prompt:",
    input.prompt,
    safeLearnerInput ? `Learner input:\n${safeLearnerInput}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
  }

  const env = getServerEnv()
  if (!env.GROQ_HINTS_ENABLED) {
    return apiOk({
      enabled: false,
      hint: null,
      source: "disabled",
    })
  }

  if (!env.GROQ_API_KEY) {
    return apiOk({
      enabled: false,
      hint: null,
      source: "missing_api_key",
    })
  }

  const parsedBody = hintRequestSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return apiOk({
      enabled: true,
      hint: null,
      source: "invalid_payload",
    })
  }

  const models = [
    env.GROQ_HINTS_MODEL || DEFAULT_GROQ_MODEL,
    ...parseFallbackModels(env.GROQ_HINTS_FALLBACK_MODELS),
  ].filter((model, index, all) => all.indexOf(model) === index)

  const prompt = buildHintPrompt(parsedBody.data)

  let lastFailureSource: "provider_error" | "timeout_or_network" = "provider_error"

  for (const model of models) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      })

      if (!response.ok) {
        lastFailureSource = "provider_error"
        continue
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const hint = payload.choices?.[0]?.message?.content?.trim() || null

      return apiOk({
        enabled: true,
        hint,
        source: hint ? "groq" : "empty",
        model,
        advisory: true,
      })
    } catch {
      lastFailureSource = "timeout_or_network"
    } finally {
      clearTimeout(timeout)
    }
  }

  return apiOk({
    enabled: true,
    hint: null,
    source: lastFailureSource,
  })
}
