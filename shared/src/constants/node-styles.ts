import { NodeShape, NodeType } from '../models/concept-map';

/**
 * Color palette for noun nodes (cool colors)
 */
export const NOUN_COLORS = [
  '#3B82F6', // blue-500
  '#2563EB', // blue-600
  '#1D4ED8', // blue-700
  '#1E40AF', // blue-800
  '#1E3A8A', // blue-900
  '#10B981', // emerald-500
  '#059669', // emerald-600
  '#047857', // emerald-700
  '#8B5CF6', // violet-500
  '#7C3AED', // violet-600
  '#6D28D9', // violet-700
] as const;

/**
 * Color palette for verb nodes (warm colors)
 */
export const VERB_COLORS = [
  '#EF4444', // red-500
  '#DC2626', // red-600
  '#B91C1C', // red-700
  '#F97316', // orange-500
  '#EA580C', // orange-600
  '#C2410C', // orange-700
  '#F59E0B', // amber-500
  '#D97706', // amber-600
  '#B45309', // amber-700
] as const;

/**
 * Node style presets by type
 */
export const NODE_STYLE_PRESETS = {
  [NodeType.NOUN]: {
    shape: NodeShape.RECTANGLE,
    colors: NOUN_COLORS,
    borderRadius: 0,
  },
  [NodeType.VERB]: {
    shape: NodeShape.ROUNDED_RECTANGLE,
    colors: VERB_COLORS,
    borderRadius: 12,
  },
} as const;

/**
 * Link style constants
 */
export const LINK_STYLE = {
  color: '#6B7280',
  strokeWidth: 2,
} as const;

/**
 * Get default style for a node type
 */
export function getDefaultNodeStyle(type: NodeType, colorIndex = 0) {
  const preset = NODE_STYLE_PRESETS[type];
  const colors = preset.colors;
  const safeIndex = colorIndex % colors.length;

  return {
    shape: preset.shape,
    color: colors[safeIndex],
    borderRadius: preset.borderRadius,
  };
}
