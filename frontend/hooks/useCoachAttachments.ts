// Phase 5 (10Y-E): Pending photo-attachment state for the Coach composer.
// Owns a small queue of {uri, base64, mediaType} entries plus capped add/remove.
// Camera + library pickers live here so the screen can stay declarative.

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { CoachAttachmentMediaType } from '../lib/api';

export const MAX_COACH_ATTACHMENTS = 4;

export interface PendingCoachAttachment {
  id: string;
  uri: string;
  base64: string;
  mediaType: CoachAttachmentMediaType;
}

export type CoachAttachmentSource = 'camera' | 'library';

export interface UseCoachAttachmentsResult {
  attachments: PendingCoachAttachment[];
  pickFromCamera: () => Promise<PendingCoachAttachment | null>;
  pickFromLibrary: () => Promise<PendingCoachAttachment | null>;
  remove: (id: string) => void;
  clear: () => void;
  canAdd: boolean;
}

const makeId = (): string => `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function inferMediaType(uri: string): CoachAttachmentMediaType {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

interface PickerLike {
  requestCameraPermissionsAsync: typeof ImagePicker.requestCameraPermissionsAsync;
  requestMediaLibraryPermissionsAsync: typeof ImagePicker.requestMediaLibraryPermissionsAsync;
  launchCameraAsync: typeof ImagePicker.launchCameraAsync;
  launchImageLibraryAsync: typeof ImagePicker.launchImageLibraryAsync;
  MediaTypeOptions: typeof ImagePicker.MediaTypeOptions;
}

// Allow tests to inject a fake picker without mocking the entire module path.
export function useCoachAttachments(
  picker: PickerLike = ImagePicker,
): UseCoachAttachmentsResult {
  const [attachments, setAttachments] = useState<PendingCoachAttachment[]>([]);

  const addAttachment = useCallback(
    (entry: PendingCoachAttachment) => {
      setAttachments((prev) => {
        if (prev.length >= MAX_COACH_ATTACHMENTS) return prev;
        return [...prev, entry];
      });
    },
    [],
  );

  const pickFromCamera = useCallback(async () => {
    if (attachments.length >= MAX_COACH_ATTACHMENTS) return null;
    const perm = await picker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const result = await picker.launchCameraAsync({
      mediaTypes: picker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    if (!asset.base64) return null;
    const entry: PendingCoachAttachment = {
      id: makeId(),
      uri: asset.uri,
      base64: asset.base64,
      mediaType: inferMediaType(asset.uri),
    };
    addAttachment(entry);
    return entry;
  }, [attachments.length, picker, addAttachment]);

  const pickFromLibrary = useCallback(async () => {
    if (attachments.length >= MAX_COACH_ATTACHMENTS) return null;
    const perm = await picker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const result = await picker.launchImageLibraryAsync({
      mediaTypes: picker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    if (!asset.base64) return null;
    const entry: PendingCoachAttachment = {
      id: makeId(),
      uri: asset.uri,
      base64: asset.base64,
      mediaType: inferMediaType(asset.uri),
    };
    addAttachment(entry);
    return entry;
  }, [attachments.length, picker, addAttachment]);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    pickFromCamera,
    pickFromLibrary,
    remove,
    clear,
    canAdd: attachments.length < MAX_COACH_ATTACHMENTS,
  };
}
