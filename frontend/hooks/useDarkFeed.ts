// frontend/hooks/useDarkFeed.ts
// "Dark Feed" preference — forces dark card backgrounds in light mode for better food photography

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_FEED_KEY = 'sazon_dark_feed';

/**
 * Hook to manage the "Dark Feed" toggle.
 * When enabled, recipe cards use near-black backgrounds even in light mode,
 * making food photography pop with higher perceived contrast.
 */
export function useDarkFeed() {
  const [darkFeed, setDarkFeed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_FEED_KEY).then((val) => {
      if (val === 'true') setDarkFeed(true);
      setLoaded(true);
    });
  }, []);

  const toggleDarkFeed = useCallback(async () => {
    const next = !darkFeed;
    setDarkFeed(next);
    await AsyncStorage.setItem(DARK_FEED_KEY, next ? 'true' : 'false');
  }, [darkFeed]);

  return { darkFeed, toggleDarkFeed, loaded };
}
