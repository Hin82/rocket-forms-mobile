import { useEffect, useRef } from 'react';
import * as StoreReview from 'expo-store-review';
import * as SecureStore from 'expo-secure-store';

const RATING_KEY = 'app_rating_state';
const ACTIONS_BEFORE_PROMPT = 5;
const DAYS_BETWEEN_PROMPTS = 30;

interface RatingState {
  actionCount: number;
  lastPromptDate: string | null;
  hasRated: boolean;
}

async function getRatingState(): Promise<RatingState> {
  try {
    const raw = await SecureStore.getItemAsync(RATING_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    if (__DEV__) console.warn('getRatingState failed:', err);
  }
  return { actionCount: 0, lastPromptDate: null, hasRated: false };
}

async function saveRatingState(state: RatingState): Promise<void> {
  await SecureStore.setItemAsync(RATING_KEY, JSON.stringify(state));
}

// Module-level mutex to prevent concurrent read-modify-write
let trackingInFlight = false;

/**
 * Call after meaningful user actions (form created, form viewed, etc.)
 * After enough actions, prompts for a store review.
 */
export async function trackAction(): Promise<void> {
  if (trackingInFlight) return;
  trackingInFlight = true;

  try {
    const state = await getRatingState();

    if (state.hasRated) return;

    // Check cooldown since last prompt
    if (state.lastPromptDate) {
      const daysSince = (Date.now() - new Date(state.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DAYS_BETWEEN_PROMPTS) {
        state.actionCount++;
        await saveRatingState(state);
        return;
      }
    }

    state.actionCount++;

    if (state.actionCount >= ACTIONS_BEFORE_PROMPT) {
      const canReview = await StoreReview.isAvailableAsync();
      if (canReview) {
        await StoreReview.requestReview();
        state.hasRated = true;
        state.lastPromptDate = new Date().toISOString();
        state.actionCount = 0;
      }
    }

    await saveRatingState(state);
  } catch (err) {
    if (__DEV__) console.warn('trackAction failed:', err);
  } finally {
    trackingInFlight = false;
  }
}

// Track unique form views to avoid inflating count
const viewedFormIds = new Set<string>();

/**
 * Hook that tracks an action on mount, deduplicated by formId.
 */
export function useTrackAction(formId?: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    if (formId && viewedFormIds.has(formId)) return;

    tracked.current = true;
    if (formId) viewedFormIds.add(formId);

    trackAction().catch(err => {
      if (__DEV__) console.warn('useTrackAction failed:', err);
    });
  }, [formId]);
}
