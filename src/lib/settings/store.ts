import { load, type Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type AppSettings } from "./types";
import { isTauri } from "../isTauri";

const STORE_FILE = "settings.json";
const SETTINGS_KEY = "settings";
const WEB_STORAGE_KEY = "quicktranslate_settings";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE, {
      autoSave: true,
      defaults: { [SETTINGS_KEY]: DEFAULT_SETTINGS },
    });
  }
  return storePromise;
}

export async function loadSettings(): Promise<AppSettings> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem(WEB_STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }
  const store = await getStore();
  const saved = await store.get<Partial<AppSettings>>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...saved };
}

let saveQueue: Promise<void> = Promise.resolve();

export function saveSettings(settings: AppSettings): Promise<void> {
  const snapshot = structuredClone(settings);
  const pending = saveQueue.catch(() => {}).then(() => persistSettings(snapshot));
  saveQueue = pending;
  return pending;
}

async function persistSettings(settings: AppSettings): Promise<void> {
  if (!isTauri()) {
    try {
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
    return;
  }
  const store = await getStore();
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}
