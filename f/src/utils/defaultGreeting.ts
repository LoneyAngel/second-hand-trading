import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'default_greeting';
export const DEFAULT_GREETING = '你好';

export async function getDefaultGreeting(): Promise<string> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value || DEFAULT_GREETING;
  } catch {
    return DEFAULT_GREETING;
  }
}

export async function setDefaultGreeting(text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, text || DEFAULT_GREETING);
  } catch {
    // ignore
  }
}
