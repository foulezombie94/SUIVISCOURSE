import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/typography';
import { sessionKinds, sessionMeasure, type PlanSession } from './plans';

export function ProgrammeSessionCard({ session, done = false, inProgress = false, date, onPress, onToggle, disabled }: {
  session: PlanSession; done?: boolean; date?: Date; onPress: () => void;
  onToggle?: () => void; disabled?: boolean; inProgress?: boolean;
}) {
  const kind = sessionKinds[session.kind];
  return <View style={{ borderWidth: 1, borderColor: inProgress ? '#000000' : '#E9E9E9', borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ padding: 17, gap: 14, backgroundColor: pressed ? '#F8F8F8' : '#FFFFFF' })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: onToggle ? 38 : 0 }}>
        <View style={{ width: 43, height: 43, borderRadius: 13, backgroundColor: kind.color,
          alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={kind.icon} size={23} color="#000000" />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: '#737373', fontSize: 10, textTransform: 'uppercase', fontWeight: '600' }}>
            {date ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : `Séance ${session.ordinal}`}</Text>
          <Text style={{ color: '#000000', fontSize: 16, fontWeight: '700' }}>{session.title}</Text>
        </View>
        {!onToggle ? <MaterialCommunityIcons name="chevron-right" size={20} color="#000000" /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
        <Text style={{ color: '#000000', fontSize: 18, fontWeight: '700', flex: 1 }}>{sessionMeasure(session)}</Text>
        {inProgress ? <Text style={{ color: '#000000', fontSize: 11, fontWeight: '700' }}>En cours</Text>
          : done ? <Text style={{ color: '#000000', fontSize: 11 }}>Terminée</Text>
          : <MaterialCommunityIcons name="arrow-top-right" size={19} color="#000000" />}
      </View>
    </Pressable>
    {onToggle ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done, disabled }}
      accessibilityLabel={done ? 'Marquer la séance à faire' : 'Marquer la séance comme faite'}
      disabled={disabled} onPress={onToggle}
      style={{ position: 'absolute', top: 16, right: 12, width: 44, height: 44,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
      <MaterialCommunityIcons name={done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
        size={26} color={done ? '#000000' : '#929292'} />
    </Pressable> : null}
  </View>;
}
