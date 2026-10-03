import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunnerProfile } from '@/features/onboarding/use-runner-profile';
import { getMyProfile } from '@/services/friends';
import { supabase } from '@/services/supabase';

const black = '#000000';
const soft = '#F5F5F5';
const green = '#B9F532';

function MenuRow({ icon, label, onPress }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => ({ backgroundColor: soft, borderRadius: 17, height: 54,
      paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 12,
      opacity: pressed ? 0.65 : 1 })}>
    <MaterialCommunityIcons name={icon} size={21} color={black} />
    <Text style={{ flex: 1, color: black, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    <MaterialCommunityIcons name="chevron-right" size={22} color={black} />
  </Pressable>;
}

export default function Profile() {
  const { session } = useAuth();
  const id = session?.user.id ?? '';
  const cache = useQueryClient();
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => getMyProfile(id), enabled: !!id });
  const runner = useRunnerProfile();
  const [dialog, setDialog] = useState<'profile' | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = profile.data?.display_name || 'Ton profil';
  const currentWeight = runner.data?.weightKg;
  const weightLabel = currentWeight == null ? '—' : `${currentWeight.toLocaleString('fr-FR')} kg`;
  const courseProfile = runner.data;
  const completedFields = [courseProfile?.age, currentWeight, courseProfile?.heightCm,
    courseProfile?.runningLevel, courseProfile?.runsPerWeek].filter((value) => value != null).length;
  const levelLabel = courseProfile?.runningLevel === 'regular' ? 'Régulier'
    : courseProfile?.runningLevel === 'occasional' ? 'Occasionnel'
      : courseProfile?.runningLevel === 'beginner' ? 'Débutant' : '—';
  const frequencyLabel = courseProfile?.runsPerWeek === 1 ? '1 à 2 sorties / semaine'
    : courseProfile?.runsPerWeek === 3 ? '3 à 4 sorties / semaine'
      : courseProfile?.runsPerWeek === 5 ? '5 sorties ou plus / semaine' : 'Fréquence à renseigner';
  function openDialog(kind: 'profile') {
    setName(profile.data?.display_name ?? '');
    setBio(profile.data?.bio ?? '');
    setError(''); setDialog(kind);
  }
  async function save() {
    if (!id || saving) return;
    if (!name.trim()) { setError('Entre ton nom.'); return; }
    setSaving(true); setError('');
    try {
      const { error: saveError } = await supabase.from('profiles').update({ display_name: name.trim(),
        bio: bio.trim() || null, updated_at: new Date().toISOString() }).eq('id', id);
      if (saveError) throw saveError;
      await cache.invalidateQueries({ queryKey: ['profile', id] });
      setDialog(null);
    } catch { setError('Enregistrement impossible. Réessaie.'); }
    finally { setSaving(false); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 15, paddingBottom: 110 }}>
      <View style={{ alignItems: 'center', paddingTop: 2, marginBottom: 24 }}>
        <View style={{ position: 'absolute', left: 0, top: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Paramètres et statistiques"
            onPress={() => router.push('/profile/details')}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: soft,
              alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={black} />
          </Pressable>
        </View>
        <View style={{ position: 'absolute', right: 0, top: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications"
            onPress={() => router.push('/social/notifications')}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: soft,
              alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bell-outline" size={21} color={black} />
          </Pressable>
        </View>
        <View style={{ width: 112, height: 112, borderRadius: 56, overflow: 'hidden',
          backgroundColor: '#ECEEE8', alignItems: 'center', justifyContent: 'center' }}>
          {profile.data?.avatar_url && !avatarFailed
            ? <Image source={{ uri: profile.data.avatar_url }} onError={() => setAvatarFailed(true)}
              accessibilityLabel={`Photo de ${displayName}`} style={{ width: '100%', height: '100%' }} />
            : <Text style={{ color: black, fontSize: 38, fontWeight: '700' }}>
              {profile.data?.display_name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'É'}</Text>}
        </View>
        <Text style={{ color: black, fontSize: 25, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>{displayName}</Text>
      </View>

      <View style={{ backgroundColor: '#202421', borderRadius: 19, padding: 19, gap: 17 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>PROFIL DE COURSE</Text>
          <MaterialCommunityIcons name="run-fast" size={21} color="#FFFFFF" />
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="Informations de course renseignées"
          accessibilityValue={{ min: 0, max: 5, now: completedFields }}
          style={{ height: 11, borderRadius: 6, backgroundColor: '#464B44', overflow: 'hidden' }}>
          <View style={{ height: 11, backgroundColor: green, borderRadius: 6, width: `${completedFields / 5 * 100}%` }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { label: 'Âge', value: courseProfile?.age == null ? '—' : `${courseProfile.age} ans`, align: 'left' },
            { label: 'Poids', value: weightLabel, align: 'center' },
            { label: 'Taille', value: courseProfile?.heightCm == null ? '—' : `${courseProfile.heightCm} cm`, align: 'right' },
          ].map((item) => <View key={item.label} style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: '#B9BDB9', fontSize: 11, textAlign: item.align as 'left' | 'center' | 'right' }}>{item.label}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18,
              textAlign: item.align as 'left' | 'center' | 'right' }}>{item.value}</Text>
          </View>)}
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: '#464B44', paddingTop: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{levelLabel}</Text>
          <Text style={{ color: '#B9BDB9', fontSize: 11, flex: 1, textAlign: 'right' }}>{frequencyLabel}</Text>
        </View>
      </View>
      {runner.isError ? <Text style={{ color: black, marginTop: 9, fontSize: 12 }}>Ton profil de course est indisponible pour le moment.</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/onboarding')}
        style={({ pressed }) => ({ backgroundColor: '#202421', height: 49, borderRadius: 25,
          marginTop: 15, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Modifier mes infos de course</Text>
      </Pressable>
      <View style={{ gap: 14, marginTop: 27 }}>
        <MenuRow icon="account-edit-outline" label="Modifier le profil" onPress={() => openDialog('profile')} />
        <MenuRow icon="bookmark-outline" label="Séances enregistrées" onPress={() => router.push({
          pathname: '/profile/history', params: { favorites: 'yes' },
        })} />
        <MenuRow icon="history" label="Historique" onPress={() => router.push('/profile/history')} />
      </View>

      {profile.isError ? <Text style={{ color: black, fontSize: 13, marginTop: 15 }}>Le profil n’a pas pu être chargé.</Text> : null}
    </ScrollView>
    <Modal visible={dialog != null} transparent animationType="fade" onRequestClose={() => { if (!saving) setDialog(null); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 17 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: black, fontSize: 21, fontWeight: '700' }}>Modifier le profil</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" disabled={saving}
              onPress={() => setDialog(null)} hitSlop={10}><MaterialCommunityIcons name="close" size={23} color={black} /></Pressable>
          </View>
          <>
            <TextInput accessibilityLabel="Nom affiché" placeholder="Nom affiché" placeholderTextColor="#666666"
              value={name} onChangeText={setName} maxLength={80}
              style={{ backgroundColor: soft, borderRadius: 14, padding: 16, color: black, fontSize: 16 }} />
            <TextInput accessibilityLabel="Bio" placeholder="Bio" placeholderTextColor="#666666" value={bio}
              onChangeText={setBio} maxLength={180} multiline
              style={{ backgroundColor: soft, borderRadius: 14, padding: 16, color: black, fontSize: 16 }} />
          </>
          {error ? <Text style={{ color: '#BD192C', fontSize: 13 }}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()}
            style={{ backgroundColor: black, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            {saving ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Enregistrer</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}
