import type { NextResponse } from "next/server";
import { apiError } from "@/lib/apiError";
import { ExerciseSessionError } from "@/lib/learning/contentProgress";

// Alleen voor route handlers (apiError gebruikt next/headers): de vertaling
// van een fout bij het inleveren van een oefenset naar een API-antwoord.
export async function exerciseSessionErrorResponse(error: unknown): Promise<NextResponse | null> {
  if (!(error instanceof ExerciseSessionError)) return null;
  switch (error.code) {
    case "NOT_FOUND":
      return apiError("apiErrors.lessonNotFound", 404);
    case "ALREADY_SUBMITTED":
      return apiError("apiErrors.exercisesAlreadySubmitted", 409);
    case "INCOMPLETE":
      return apiError("apiErrors.exercisesIncomplete", 400);
    case "LOCKED":
      return apiError("apiErrors.stepLocked", 403);
  }
}
