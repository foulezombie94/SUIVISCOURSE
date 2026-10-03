import { useMemo } from 'react';
import { View } from 'react-native';
import { Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { useReducedMotion } from 'react-native-reanimated';
import { Area, Bar, CartesianChart, Line, Scatter, useChartPressState } from 'victory-native';
import { Text } from '@/components/typography';

export function HomeMetricChart({ values, kind }: { values: (number | null)[]; kind: 'pace' | 'distance' }) {
  const data = useMemo(() => values.map((value, day) => ({ day, value })), [values]);
  const color = kind === 'pace' ? '#ED7D65' : '#58AE8B';
  const maximum = Math.max(1, ...values.map((value) => value ?? 0));
  const { state, isActive } = useChartPressState({ x: 0, y: { value: 0 } });
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? undefined : { type: 'timing' as const, duration: 350 };
  if (!values.some((value) => value != null && value > 0)) {
    return <View style={{ height: 115, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 11, color: '#65616C', textAlign: 'center' }}>Aucune sortie sur cette période</Text>
    </View>;
  }
  return <View style={{ height: 115 }} accessibilityLabel={kind === 'pace'
    ? 'Allure moyenne sur la période sélectionnée' : 'Distance sur la période sélectionnée'}>
    <CartesianChart data={data} xKey="day" yKeys={['value']} domain={{ x: [0, 6], y: [0, maximum * 1.15] }}
      padding={{ left: 5, right: 5, top: 8, bottom: 8 }} domainPadding={{ left: 6, right: 6 }}
      yAxis={[{ lineWidth: 0 }]} chartPressState={state}
      chartPressConfig={{ pan: { activateAfterLongPress: 150 } }}>
      {({ points, chartBounds }) => <>
        {kind === 'distance' ? <Bar points={points.value} chartBounds={chartBounds} innerPadding={0.65}
          color={color} animate={animate} roundedCorners={{ topLeft: 2, topRight: 2 }} /> : <>
          <Area points={points.value} y0={chartBounds.bottom} curveType="linear" animate={animate} connectMissingData={false}>
            <LinearGradient start={vec(0, chartBounds.top)} end={vec(0, chartBounds.bottom)}
              colors={['rgba(237, 125, 101, 0.16)', 'rgba(237, 125, 101, 0)']} />
          </Area>
          <Line points={points.value} curveType="linear" color={color} strokeWidth={1.8}
            strokeCap="round" connectMissingData={false} animate={animate} />
          <Scatter points={points.value} radius={2} color={color} />
        </>}
        {isActive ? <Circle cx={state.x.position} cy={state.y.value.position} r={4} color={color} /> : null}
      </>}
    </CartesianChart>
  </View>;
}
