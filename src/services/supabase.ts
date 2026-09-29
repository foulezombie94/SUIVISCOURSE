import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) throw new Error('Configuration Supabase absente.');

// SecureStore has a per-item size limit, so sessions are stored in small chunks.
const storage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!Number.isInteger(count) || count < 1 || count > 32) return null;
    const values = await Promise.all(Array.from({ length: count }, (_, i) =>
      SecureStore.getItemAsync(`${key}.${i}`)));
    return values.some((value) => value == null) ? null : values.join('');
  },
  async setItem(key: string, value: string) {
    const previous = Number(await SecureStore.getItemAsync(`${key}.count`)) || 0;
    const chunks = value.match(/[\s\S]{1,1500}/g) ?? [];
    if (chunks.length > 32) throw new Error('Session trop grande pour SecureStore.');
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
    await Promise.all(Array.from({ length: Math.max(0, previous - chunks.length) }, (_, i) =>
      SecureStore.deleteItemAsync(`${key}.${chunks.length + i}`)));
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`)) || 0;
    await Promise.all(Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(`${key}.${i}`)));
    await SecureStore.deleteItemAsync(`${key}.count`);
  },
};

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
  },
});
