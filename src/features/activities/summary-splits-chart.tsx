import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAnimatedReaction, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Bar, CartesianChart, useChartPressState } from 'victory-native';
import { Line } from '@shopify/react-native-skia';
import type { Split } from '@/types/domain';
import { Text } from '@/components/typography';
import { formatPace } from '@/utils/format';

export function SummarySplitsChart({ splits }: { splits: Split[] }) {
  const groupSize = Math.max(1, Math.ceil(splits.length / 5));
  const bars = useMemo(() => Array.from({ length: Math.ceil(splits.length / groupSize) }, (_, index) => {
    const group = splits.slice(index * groupSize, (index + 1) * groupSize);
    return { index, firstKm: group[0].kilometer, lastKm: group[group.length - 1].kilometer,
      pace: group.reduce((sum, split) => sum + split.movingSeconds, 0) / group.length };
  }), [groupSize, splits]);
  const maximum = Math.max(1, ...bars.map((bar) => bar.pace));
  const average = bars.reduce((sum, bar) => sum + bar.pace, 0) / Math.max(1, bars.length);
  const { state, isActive } = useChartPressState({ x: 0, y: { pace: 0 } });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  useAnimatedReaction(() => state.matchedIndex.value, (index, previous) => {
    if (index !== previous) scheduleOnRN(setSelectedIndex, index);
  });

  if (!bars.length) return <Text style={{ color: '#9698A2', fontSize: 13, paddingVertical: 24 }}>
    Les temps par kilomètre apparaîtront après un kilomètre complet.</Text>;

  return <View>
    <View style={{ height: 110 }} accessibilityLabel="Graphique d’allure par kilomètre">
      <CartesianChart data={bars} xKey="index" yKeys={['pace']}
        domain={{ x: [0, Math.max(1, bars.length - 1)], y: [0, maximum * 1.08] }}
        padding={{ left: 4, right: 4, top: 10, bottom: 5 }}
        domainPadding={{ left: 30, right: 30 }} yAxis={[{ lineWidth: 0 }]}
        chartPressState={state} chartPressConfig={{ pan: { activateAfterLongPress: 120 } }}>
        {({ points, chartBounds }) => {
          const selected = isActive ? selectedIndex : 0;
          const y = chartBounds.bottom - average / (maximum * 1.08)
            * (chartBounds.bottom - chartBounds.top);
          return <>
            <Bar points={points.pace.filter((_, index) => index !== selected)}
              chartBounds={chartBounds} barCount={bars.length} innerPadding={0.12} color="#34363D"
              animate={reducedMotion ? undefined : { type: 'timing', duration: 400 }} />
            <Bar points={points.pace.filter((_, index) => index === selected)}
              chartBounds={chartBounds} barCount={bars.length} innerPadding={0.12} color="#ED183B"
              animate={reducedMotion ? undefined : { type: 'timing', duration: 400 }} />
            <Line p1={{ x: chartBounds.left, y }} p2={{ x: chartBounds.right, y }}
              color="#74767E" strokeWidth={1} />
          </>;
        }}
      </CartesianChart>
    </View>
    {isActive && bars[selectedIndex] ? <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 6 }}>
      KM {bars[selectedIndex].firstKm}{bars[selectedIndex].lastKm > bars[selectedIndex].firstKm
        ? `–${bars[selectedIndex].lastKm}` : ''} · {formatPace(bars[selectedIndex].pace)} /km</Text> :
      <Text style={{ color: '#9698A2', fontSize: 11, marginTop: 6 }}>
        Allure / km · moyenne {formatPace(average)}
      </Text>}
  </View>;
}
