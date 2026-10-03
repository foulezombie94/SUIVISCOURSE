import type { ActivityType } from '@/types/domain';
import { MAX_WEIGHT_KG, MIN_WEIGHT_KG } from '@/features/onboarding/runner-profile-limits';

// Active energy on level ground: approximately 1 kcal/kg/km running,
// and 0.5 kcal/kg/km walking (Margaria et al., J Appl Physiol, 1963).
const KCAL_PER_KG_KM: Record<ActivityType, number> = {
  running: 1,
  walking: 0.5,
  trail: 1,
};

export function estimateActiveCalories(
  activityType: ActivityType,
  weightKg: number | null,
  distanceMeters: number,
): number | null {
  if (weightKg == null || !Number.isFinite(weightKg) ||
    weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG ||
    !Number.isFinite(distanceMeters) || distanceMeters < 0) return null;

  return Math.round(weightKg * (distanceMeters / 1000) * KCAL_PER_KG_KM[activityType]);
}
