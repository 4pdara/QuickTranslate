import type { TranslationProvider } from "../types";
import { TranslationError } from "../types";

// Stub בלבד — לא מומש עדיין. נשמר כדי שהפשטת הספק לא תהיה נעולה לספק יחיד.
export const azureProvider: TranslationProvider = {
  id: "azure",
  label: "Azure Translator (בקרוב)",
  category: "advanced",
  requiresApiKey: true,
  supportsServerUrl: false,
  note: "ספק מתקדם עתידי — דורש מפתח API בתשלום. עדיין לא מומש באפליקציה.",

  async translate(): Promise<never> {
    throw new TranslationError("ספק Azure Translator עדיין לא מומש באפליקציה זו.", "azure");
  },

  async testConnection(): Promise<boolean> {
    return false;
  },
};
