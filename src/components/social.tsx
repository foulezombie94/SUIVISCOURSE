import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { palette } from '@/constants/palette';
import type { Profile } from '@/types/domain';

export function FriendPicker({ friends, selected, onChange }: {
  friends: Profile[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  return <View style={{ gap: 8 }}>{friends.length ? friends.map((friend) => {
    const checked = selected.includes(friend.id);
    return <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked }}
      onPress={() => onChange(checked ? selected.filter((id) => id !== friend.id)
        : selected.length < 4 ? [...selected, friend.id] : selected)}
      style={{ padding: 13, borderRadius: 12, backgroundColor: checked ? palette.accent : palette.surfaceAlt }}>
      <Text style={{ color: checked ? palette.accentText : palette.text, fontWeight: '800' }}>
        {checked ? '✓ ' : ''}{friend.display_name} · @{friend.username}</Text>
    </Pressable>;
  }) : <Text style={{ color: palette.muted }}>Ajoute un ami pour lancer un défi privé.</Text>}</View>;
}

export function ProgressMeter({ ratio }: { ratio: number }) {
  const percent = Math.max(0, Math.min(100, ratio * 100));
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceAlt }}>
    <View style={{ height: 8, width: `${percent}%`, borderRadius: 4, backgroundColor: palette.accent }} />
  </View>;
}
