// Tier Q — Beta feedback intake.
//
// Thin client for `POST /api/feedback`. Public route (no auth header
// required); testers may submit feedback while signed out.

import { Platform } from 'react-native';
import { api } from './core';
import { APP_VERSION, BUILD_NUMBER, BUILD_CHANNEL } from '../../constants/build';

export interface FeedbackPayload {
  message: string;
  screen?: string;
  nps?: number;
}

export interface FeedbackSubmission {
  id: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function submitFeedback(
  payload: FeedbackPayload,
): Promise<FeedbackSubmission> {
  const body = {
    message: payload.message.trim(),
    screen: payload.screen,
    nps: payload.nps,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    appVersion: APP_VERSION,
    buildNumber: BUILD_NUMBER,
    device: `${Platform.OS} ${Platform.Version} (${BUILD_CHANNEL})`,
  };

  const res = await api.post<ApiEnvelope<FeedbackSubmission>>('/feedback', body);
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.error || 'Failed to send feedback');
  }
  return res.data.data;
}
