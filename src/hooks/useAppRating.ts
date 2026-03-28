import { useEffect } from 'react';
import * as StoreReview from 'expo-store-review';
import * as SecureStore from 'expo-secure-store';

const RATING_KEY = 'app_rating_state';
const ACTIONS_BEFORE_PROMPT = 5; // Ask after 5 meaningful actions
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
  } catch {}
  return { actionCount: 0, lastPromptDate: null, hasRated: false };
}

async function saveRatingState(state: RatingState): Promise<void> {
  await SecureStore.setItemAsync(RATING_KEY, JSON.stringify(state));
}

/**
 * Call this after meaningful user actions (form created, submission viewed, etc.)
 * After enough actions, it will prompt for a store review.
 */
export async function trackAction(): Promise<void> {
  const state = await getRatingState();

  if (state.hasRated) return;

  // Check if enough time has passed since last prompt
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
      state.lastPromptDate = new Date().toISOString();
      state.actionCount = 0;
    }
  }

  await saveRatingState(state);
}

/**
 * Hook that tracks an action on mount (e.g., when a screen is viewed).
 */
export function useTrackAction() {
  useEffect(() => {
    trackAction();
  }, []);
}
