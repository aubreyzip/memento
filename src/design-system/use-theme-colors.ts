import { useColorScheme } from 'react-native';

import { colors, type SemanticColors } from './tokens';

/**
 * Semantic colors for the current OS appearance.
 * The in-app System / Light / Dark setting (B-015) is added with settings persistence in Phase 1.
 */
export function useThemeColors(): SemanticColors {
  return colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
