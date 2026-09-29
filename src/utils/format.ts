export const formatKm = (meters: number) => (meters / 1000).toFixed(2).replace('.', ',');
export function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function formatPace(pace: number | null) {
  if (!pace || !Number.isFinite(pace)) return '—';
  const rounded = Math.round(pace);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
