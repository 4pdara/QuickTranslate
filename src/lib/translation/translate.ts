import type { AppSettings } from "../settings/types";
import { getEffectiveServerUrl, getProvider, isProviderConfigured } from "./registry";
import { TranslationError, type TranslateResult } from "./types";

/** מבצעת תרגום לפי הספק וההגדרות הנוכחיות. נזרקת TranslationError עם הודעה בעברית בכל כשל. */
export async function translateWithSettings(
  settings: AppSettings,
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const provider = getProvider(settings.selectedProvider);
  if (!provider) {
    throw new TranslationError("ספק התרגום שנבחר לא נמצא. בדוק את ההגדרות.", settings.selectedProvider);
  }
  if (!isProviderConfigured(provider, settings)) {
    throw new TranslationError("יש להגדיר את ספק התרגום בהגדרות (מפתח API ו/או כתובת שרת).", provider.id);
  }

  const apiKey = settings.providerApiKeys[provider.id] ?? "";
  const serverUrl = getEffectiveServerUrl(provider, settings);

  return provider.translate({ text, sourceLanguage, targetLanguage, apiKey, serverUrl });
}
