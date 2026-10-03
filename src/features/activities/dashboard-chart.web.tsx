import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export function DashboardChart({ values, height = 144 }: { values: number[]; height?: number | '100%' }) {
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: 6 + index / Math.max(1, values.length - 1) * 288,
    y: 112 - value / maximum * 96,
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const last = points[points.length - 1];
  const area = last ? `${line} L ${last.x} 122 L 6 122 Z` : '';
  return <Svg width="100%" height={height} viewBox="0 0 300 130" accessibilityLabel="Graphique de distance des activités enregistrées">
    <Defs>
      <LinearGradient id="distanceLine" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#DCE8D4" /><Stop offset="1" stopColor="#B9F532" />
      </LinearGradient>
      <LinearGradient id="distanceArea" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#B9F532" stopOpacity={0.18} />
        <Stop offset="1" stopColor="#B9F532" stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Path d={area} fill="url(#distanceArea)" />
    <Path d={line} fill="none" stroke="url(#distanceLine)" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
