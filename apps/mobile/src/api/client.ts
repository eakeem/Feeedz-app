import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;

function validHttpUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\/.+/.test(value) && !value.includes('${');
}

function validValue(value: string | undefined): value is string {
  return !!value && !value.includes('${');
}

export const apiBaseUrl = validHttpUrl(extra?.apiUrl) ? extra.apiUrl : 'http://localhost:3000/v1';

const supabaseUrl = validHttpUrl(extra?.supabaseUrl) ? extra.supabaseUrl : 'http://localhost:54321';
const supabaseAnonKey = validValue(extra?.supabaseAnonKey) ? extra.supabaseAnonKey : 'demo-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}