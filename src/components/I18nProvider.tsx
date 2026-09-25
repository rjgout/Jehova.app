"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { translateWith, type PartialMessages, type TFunction } from "@/lib/i18n/core";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/languages";

interface I18nValue {
  language: LanguageCode;
  messages: PartialMessages | undefined;
}

// Zonder provider (bv. in een los getest component) gewoon Nederlands.
const I18nContext = createContext<I18nValue>({ language: DEFAULT_LANGUAGE, messages: undefined });

// De layout geeft alleen de teksten van de gekozen taal mee; het Nederlands
// zit als terugval al in core.ts. Zo hoeft de browser niet alle talen te laden.
export function I18nProvider({
  language,
  messages,
  children,
}: {
  language: LanguageCode;
  messages: PartialMessages;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ language, messages }}>{children}</I18nContext.Provider>;
}

export function useT(): TFunction {
  const { messages } = useContext(I18nContext);
  return useCallback<TFunction>((key, vars) => translateWith(messages, key, vars), [messages]);
}

export function useUiLanguage(): LanguageCode {
  return useContext(I18nContext).language;
}
