// Phase 5 (10Y-E): pending photo state for the Coach composer.

import { renderHook, act } from '@testing-library/react-native';
import { useCoachAttachments, MAX_COACH_ATTACHMENTS } from '../../hooks/useCoachAttachments';

function makePicker(overrides?: {
  cameraStatus?: 'granted' | 'denied';
  libraryStatus?: 'granted' | 'denied';
  cameraResult?: { canceled: boolean; assets?: Array<{ uri: string; base64?: string }> };
  libraryResult?: { canceled: boolean; assets?: Array<{ uri: string; base64?: string }> };
}) {
  const cameraStatus = overrides?.cameraStatus ?? 'granted';
  const libraryStatus = overrides?.libraryStatus ?? 'granted';
  return {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: cameraStatus }),
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: libraryStatus }),
    launchCameraAsync: jest.fn().mockResolvedValue(
      overrides?.cameraResult ?? {
        canceled: false,
        assets: [{ uri: 'file://cam.jpg', base64: 'AAAA' }],
      },
    ),
    launchImageLibraryAsync: jest.fn().mockResolvedValue(
      overrides?.libraryResult ?? {
        canceled: false,
        assets: [{ uri: 'file://lib.png', base64: 'BBBB' }],
      },
    ),
    MediaTypeOptions: { Images: 'Images' as const },
  } as never;
}

describe('useCoachAttachments', () => {
  it('starts empty with canAdd=true', () => {
    const { result } = renderHook(() => useCoachAttachments(makePicker()));
    expect(result.current.attachments).toEqual([]);
    expect(result.current.canAdd).toBe(true);
  });

  it('adds via pickFromCamera and infers image/jpeg', async () => {
    const picker = makePicker();
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromCamera();
    });
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].mediaType).toBe('image/jpeg');
    expect(result.current.attachments[0].base64).toBe('AAAA');
  });

  it('adds via pickFromLibrary and infers image/png from .png suffix', async () => {
    const picker = makePicker();
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromLibrary();
    });
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].mediaType).toBe('image/png');
  });

  it('does not add when permission is denied', async () => {
    const picker = makePicker({ cameraStatus: 'denied' });
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromCamera();
    });
    expect(result.current.attachments).toHaveLength(0);
  });

  it('does not add when picker is canceled', async () => {
    const picker = makePicker({ libraryResult: { canceled: true } });
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromLibrary();
    });
    expect(result.current.attachments).toHaveLength(0);
  });

  it('caps at MAX_COACH_ATTACHMENTS (4)', async () => {
    const picker = makePicker();
    const { result } = renderHook(() => useCoachAttachments(picker));
    for (let i = 0; i < MAX_COACH_ATTACHMENTS; i += 1) {
      await act(async () => {
        await result.current.pickFromCamera();
      });
    }
    expect(result.current.attachments).toHaveLength(MAX_COACH_ATTACHMENTS);
    expect(result.current.canAdd).toBe(false);

    // 5th attempt should not invoke the picker at all
    const callsBefore = picker.launchCameraAsync.mock.calls.length;
    await act(async () => {
      await result.current.pickFromCamera();
    });
    expect(picker.launchCameraAsync.mock.calls.length).toBe(callsBefore);
    expect(result.current.attachments).toHaveLength(MAX_COACH_ATTACHMENTS);
  });

  it('removes by id', async () => {
    const picker = makePicker();
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromCamera();
    });
    await act(async () => {
      await result.current.pickFromLibrary();
    });
    const idToRemove = result.current.attachments[0].id;

    act(() => {
      result.current.remove(idToRemove);
    });
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].id).not.toBe(idToRemove);
  });

  it('clear empties the queue', async () => {
    const picker = makePicker();
    const { result } = renderHook(() => useCoachAttachments(picker));
    await act(async () => {
      await result.current.pickFromCamera();
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.attachments).toHaveLength(0);
  });
});
