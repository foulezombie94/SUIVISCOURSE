import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { View } from 'react-native';
import { Text } from '@/components/typography';

export function HomeMetricChart({ values, kind }: { values: (number | null)[]; kind: 'pace' | 'distance' }) {
  const maximum = Math.max(1, ...values.map((value) => value ?? 0));
  const color = kind === 'pace' ? '#ED7D65' : '#58AE8B';
  const points = values.map((value, index) => value == null ? null : ({ x: 10 + index * 20, y: 100 - value / maximum * 85 }));
  if (!values.some((value) => value != null && value > 0)) return <View style={{ height: 115,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
    <Text style={{ fontSize: 11, color: '#65616C', textAlign: 'center' }}>Aucune sortie sur cette période</Text>
  </View>;
  return <Svg width="100%" height={115} viewBox="0 0 140 115">
    {kind === 'distance' ? points.map((point, index) => point ? <Rect key={index} x={point.x - 3}
      y={point.y} width={6} height={100 - point.y} rx={2} fill={color} /> : null) : <>
      <Path d={points.map((point, index) => point ? `${index === 0 || !points[index - 1] ? 'M' : 'L'} ${point.x} ${point.y}` : '').join(' ')}
        fill="none" stroke={color} strokeWidth={1.8} />
      {points.map((point, index) => point ? <Circle key={index} cx={point.x} cy={point.y} r={2} fill={color} /> : null)}
    </>}
  </Svg>;
}
