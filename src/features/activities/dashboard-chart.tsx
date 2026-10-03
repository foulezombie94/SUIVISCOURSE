import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native';
import { Text } from '@/components/typography';

export function DashboardChart({ values, height = 144 }: { values: number[]; height?: number | '100%' }) {
  const data = useMemo(() => values.map((meters, index) => ({ index, distance: meters / 1000 })), [values]);
  const maximum = Math.max(0.1, ...data.map((point) => point.distance));
  const { state, isActive } = useChartPressState({ x: 0, y: { distance: 0 } });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? undefined : { type: 'timing' as const, duration: 400 };

  // Only the selected datum crosses to React; the cursor follows the finger on the UI thread.
  useAnimatedReaction(
    () => state.matchedIndex.value,
    (index, previous) => {
      if (index !== previous) scheduleOnRN(setSelectedIndex, index);
    },
  );

  return <View style={{ height }} accessibilityLabel="Graphique de distance des activités enregistrées">
    <CartesianChart
      data={data}
      xKey="index"
      yKeys={['distance']}
      padding={{ left: 8, right: 8, top: 28, bottom: 10 }}
      domain={{ y: [0, maximum * 1.12] }}
      yAxis={[{ lineWidth: 0 }]}
      chartPressState={state}
      chartPressConfig={{ pan: { activateAfterLongPress: 150 } }}
    >
      {({ points, chartBounds }) => <>
        <Area points={points.distance} y0={chartBounds.bottom} curveType="monotoneX" animate={animate}>
          <LinearGradient
            start={vec(0, chartBounds.top)} end={vec(0, chartBounds.bottom)}
            colors={['rgba(185, 245, 50, 0.16)', 'rgba(185, 245, 50, 0)']}
          />
        </Area>
        <Line points={points.distance} curveType="monotoneX" animate={animate}
          strokeWidth={2} strokeCap="round" strokeJoin="round">
          <LinearGradient start={vec(chartBounds.left, 0)} end={vec(chartBounds.right, 0)}
            colors={['#DCE8D4', '#B9F532']} />
        </Line>
        {isActive ? <>
          <Circle cx={state.x.position} cy={state.y.distance.position} r={9} color="rgba(185, 245, 50, 0.2)" />
          <Circle cx={state.x.position} cy={state.y.distance.position} r={4} color="#B9F532" />
          <Circle cx={state.x.position} cy={state.y.distance.position} r={1.5} color="#293B42" />
        </> : null}
      </>}
    </CartesianChart>
    {isActive ? <View pointerEvents="none" style={styles.selection}>
      <Text style={styles.value}>{(data[selectedIndex]?.distance ?? 0).toFixed(2).replace('.', ',')} km</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  selection: { position: 'absolute', top: 0, right: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: '#35474E' },
  value: { fontSize: 11, color: '#F7FAF9', fontVariant: ['tabular-nums'] },
});
