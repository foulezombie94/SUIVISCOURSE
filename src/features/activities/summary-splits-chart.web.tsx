import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Split } from '@/types/domain';
import { Text } from '@/components/typography';
import { formatPace } from '@/utils/format';

export function SummarySplitsChart({ splits }: { splits: Split[] }) {
  if (!splits.length) return <Text style={{ color: '#9698A2', fontSize: 13, paddingVertical: 24 }}>
    Les temps par kilomètre apparaîtront après un kilomètre complet.</Text>;
  const groupSize = Math.max(1, Math.ceil(splits.length / 5));
  const values = Array.from({ length: Math.ceil(splits.length / groupSize) }, (_, index) => {
    const group = splits.slice(index * groupSize, (index + 1) * groupSize);
    return group.reduce((sum, split) => sum + split.movingSeconds, 0) / group.length;
  });
  const maximum = Math.max(1, ...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const barWidth = 280 / values.length;
  return <View>
    <Svg width="100%" height={110} viewBox="0 0 300 110">
      {values.map((value, index) => <Rect key={index} x={10 + index * barWidth + 2}
        y={105 - value / maximum * 95} width={Math.max(2, barWidth - 4)}
        height={value / maximum * 95} fill={index === 0 ? '#ED183B' : '#34363D'} />)}
      <Line x1={10} x2={290} y1={105 - average / maximum * 95}
        y2={105 - average / maximum * 95} stroke="#74767E" strokeWidth={1} />
    </Svg>
    <Text style={{ color: '#9698A2', fontSize: 11, marginTop: 6 }}>
      Allure / km · moyenne {formatPace(average)}
    </Text>
  </View>;
}
