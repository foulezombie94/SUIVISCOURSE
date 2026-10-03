import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/typography';
import type { TrainingPlan } from './plans';

export function PlanPoster({ plan, onPress, compact = false }: {
  plan: TrainingPlan; onPress?: () => void; compact?: boolean;
}) {
  const body = <>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 15 }}>
        <Text style={{ color: '#000000', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.level}</Text>
      </View>
      <MaterialCommunityIcons name="arrow-top-right" size={23} color="#000000" />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: compact ? 15 : 23 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#000000', fontSize: compact ? 60 : 82,
        fontWeight: '900', letterSpacing: -4, lineHeight: compact ? 69 : 89 }}>{plan.poster}</Text>
      <Text style={{ color: '#000000', fontSize: 17, fontWeight: '800' }}>{plan.unit}</Text>
    </View>
    <Svg pointerEvents="none" width={145} height={115}
      style={{ position: 'absolute', right: -27, bottom: 30, opacity: 0.2 }} viewBox="0 0 145 115">
      {[0, 13, 26].map((offset) => <Path key={offset} d={`M ${offset} 105 L ${offset + 63} 12 L ${offset + 139} 12`}
        stroke="#000000" strokeWidth={2} fill="none" />)}
    </Svg>
    <Text style={{ color: '#000000', fontSize: compact ? 18 : 23, fontWeight: '800',
      letterSpacing: -0.5, marginTop: 12, paddingRight: 25 }}>{plan.title}</Text>
    <Text style={{ color: '#000000', fontSize: 12, marginTop: 7 }}>{plan.weeks} semaines · 3 séances / semaine</Text>
  </>;
  const style = { backgroundColor: plan.color, padding: 23, borderRadius: 24, overflow: 'hidden' as const };
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => ({ ...style, opacity: pressed ? 0.8 : 1 })}>{body}</Pressable>
    : <View style={style}>{body}</View>;
}
