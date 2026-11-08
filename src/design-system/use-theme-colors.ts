import { useAppearance } from './appearance-provider';
import type { SemanticColors } from './tokens';

/** Semantic colors for the resolved appearance (user preference, or the OS when set to System). */
export function useThemeColors(): SemanticColors {
  return useAppearance().colors;
}
