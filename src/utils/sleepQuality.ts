export type SleepQualityLabel = 'Excellent' | 'Good' | 'Adequate' | 'Poor' | 'Insufficient';

export interface SleepQuality {
  label: SleepQualityLabel;
  color: string;
  /** Short range for chart legends. */
  range: string;
  description: string;
}

export const SLEEP_QUALITY_LEVELS: readonly (SleepQuality & { minimumMinutes: number })[] = [
  {
    minimumMinutes: 480,
    label: 'Excellent',
    color: '#4CAF50',
    range: '8h+',
    description: 'You got 8+ hours of sleep, which is optimal for most adults.',
  },
  {
    minimumMinutes: 420,
    label: 'Good',
    color: '#8BC34A',
    range: '7–8h',
    description: 'You got 7+ hours of sleep, which is recommended for adults.',
  },
  {
    minimumMinutes: 360,
    label: 'Adequate',
    color: '#FFC107',
    range: '6–7h',
    description: 'You got 6+ hours of sleep, which is adequate but not optimal.',
  },
  {
    minimumMinutes: 300,
    label: 'Poor',
    color: '#FF9800',
    range: '5–6h',
    description: 'You got 5+ hours of sleep, which is below recommended levels.',
  },
  {
    minimumMinutes: Number.NEGATIVE_INFINITY,
    label: 'Insufficient',
    color: '#F44336',
    range: 'under 5h',
    description: 'You got less than 5 hours of sleep, which is insufficient for most adults.',
  },
];

/** Single duration-based quality scale shared by screens and notifications. */
export function sleepQualityForMinutes(minutes: number): SleepQuality {
  return SLEEP_QUALITY_LEVELS.find(level => minutes >= level.minimumMinutes)
    ?? SLEEP_QUALITY_LEVELS[SLEEP_QUALITY_LEVELS.length - 1];
}
