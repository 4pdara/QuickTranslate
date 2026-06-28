import type { TranslationProvider } from "./types";
import type { AppSettings } from "../settings/types";
import { googleTranslateNoApiProvider } from "./providers/google-translate-no-api-provider";
import { libreTranslateProvider } from "./providers/libretranslate";
import { lingvaProvider } from "./providers/lingva";
import { googleProvider } from "./providers/google";
import { deeplProvider } from "./providers/deepl";
import { azureProvider } from "./providers/azure";

// סדר התצוגה בממשק: ללא-מפתח/חינמי קודם, מתקדם/בתשלום בסוף.
export const providers: TranslationProvider[] = [
  googleTranslateNoApiProvider,
  libreTranslateProvider,
  lingvaProvider,
  googleProvider,
  deeplProvider,
  azureProvider,
];

export function getProvider(id: string): TranslationProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function getEffectiveServerUrl(provider: TranslationProvider, settings: AppSettings): string {
  return settings.providerServerUrls[provider.id] || provider.defaultServerUrl || "";
}

/** האם לספק יש כל מה שהוא צריך כדי לתרגם בפועל (מפתח API ו/או כתובת שרת). */
export function isProviderConfigured(provider: TranslationProvider, settings: AppSettings): boolean {
  const hasApiKey = !provider.requiresApiKey || Boolean(settings.providerApiKeys[provider.id]);
  const hasServerUrl = !provider.supportsServerUrl || getEffectiveServerUrl(provider, settings) !== "";
  return hasApiKey && hasServerUrl;
}
