/**
 * Build-time feature switches. Expo inlines `process.env.EXPO_PUBLIC_*` only
 * when referenced literally, so every flag is read here by its full name.
 * Turning a cloud feature on is a release decision, not a code change.
 */
export const featureFlags = {
  /** Local financial-literacy course (bundled content, works offline). */
  learning: process.env.EXPO_PUBLIC_LEARNING_ENABLED === "true" || __DEV__,
  /** Cloud sync/grading of learning attempts (needs published answer keys). */
  learningCloud: process.env.EXPO_PUBLIC_LEARNING_CLOUD_ENABLED === "true",
  /** AI explanations for learning (server consent + paid provider tier). */
  learningAi: process.env.EXPO_PUBLIC_LEARNING_AI_ENABLED === "true",
  /** Cloud cashflow schedules, settlements and forecasts. */
  cashflowCloud: process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED === "true",
  /** Server OCR fallback when on-device recognition fails. */
  ocrFallback: process.env.EXPO_PUBLIC_OCR_FALLBACK_ENABLED === "true",
} as const;
