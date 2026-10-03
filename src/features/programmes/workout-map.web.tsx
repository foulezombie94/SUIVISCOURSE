import { View } from 'react-native';
import { Text } from '@/components/typography';
import type { Point } from '@/types/domain';

export function WorkoutMap(_props: { points: Point[]; observation: number; following: boolean; onPan: () => void }) {
  return <View style={{ flex: 1, backgroundColor: '#192229', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 13 }}>La carte en direct est disponible sur le téléphone.</Text>
  </View>;
}
