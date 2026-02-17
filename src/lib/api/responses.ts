import { NextResponse } from "next/server"

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR"

/**
 * Returns a standardized JSON success response payload.
 */
export function apiOk<T>(data: T, status: number = 200): NextResponse {
  const payload =
    data !== null && typeof data === "object"
      ? { success: true, ...(data as Record<string, unknown>) }
      : { success: true, data }

  return NextResponse.json(
    payload,
    { status }
  )
}

/**
 * Returns a standardized JSON error response payload.
 */
export function apiError(
  message: string,
  status: number,
  code: ApiErrorCode
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode: code,
    },
    { status }
  )
}