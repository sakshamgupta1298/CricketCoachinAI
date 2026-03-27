import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CONSENT_STATUS_KEY = 'ai_data_sharing_consent_status';
const AI_CONSENT_UPDATED_AT_KEY = 'ai_data_sharing_consent_updated_at';

export type AiConsentStatus = 'granted' | 'withdrawn' | 'unknown';

export async function getAiConsentStatus(): Promise<AiConsentStatus> {
  try {
    const value = await AsyncStorage.getItem(AI_CONSENT_STATUS_KEY);
    if (value === 'granted' || value === 'withdrawn') {
      return value;
    }
    return 'unknown';
  } catch (error) {
    console.error('Failed to read AI consent status:', error);
    return 'unknown';
  }
}

export async function hasAiConsent(): Promise<boolean> {
  const status = await getAiConsentStatus();
  return status === 'granted';
}

export async function setAiConsentStatus(status: Exclude<AiConsentStatus, 'unknown'>): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [AI_CONSENT_STATUS_KEY, status],
      [AI_CONSENT_UPDATED_AT_KEY, new Date().toISOString()],
    ]);
  } catch (error) {
    console.error('Failed to write AI consent status:', error);
  }
}

export async function getAiConsentUpdatedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AI_CONSENT_UPDATED_AT_KEY);
  } catch (error) {
    console.error('Failed to read AI consent updated time:', error);
    return null;
  }
}
