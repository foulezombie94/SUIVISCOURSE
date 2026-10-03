import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { GlassView } from 'expo-glass-effect';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '@/components/typography';

export type HomePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';
export type HomePeriodSelection = { period: HomePeriod; start?: Date; end?: Date };

const options: { period: HomePeriod; label: string }[] = [
  { period: 'today', label: 'Aujourd’hui' },
  { period: 'week', label: '7 derniers jours' },
  { period: 'month', label: '30 derniers jours' },
  { period: 'all', label: 'Depuis ma première course' },
];

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CalendarIcon() {
  return <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
    <Rect x={2.5} y={4.5} width={19} height={17} rx={4} stroke="#FFFFFF" strokeWidth={1.8} />
    <Path d="M7 2.5v4M17 2.5v4M3 9.5h18" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={8} cy={14} r={1.25} fill="#FFFFFF" /><Circle cx={12} cy={14} r={1.25} fill="#FFFFFF" />
    <Circle cx={16} cy={14} r={1.25} fill="#FFFFFF" />
  </Svg>;
}

export function HomePeriodPicker({ value, firstDate, onChange }: {
  value: HomePeriodSelection; firstDate: Date | null; onChange: (value: HomePeriodSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value.start ?? dayStart(firstDate ?? new Date()));
  const [end, setEnd] = useState(value.end ?? dayStart(new Date()));
  const [iosPicker, setIosPicker] = useState<'start' | 'end' | null>(null);
  const minimum = dayStart(firstDate ?? new Date());
  const maximum = dayStart(new Date());
  const selectedLabel = value.period === 'custom' && value.start && value.end
    ? `${dateLabel(value.start)} — ${dateLabel(value.end)}`
    : options.find((option) => option.period === value.period)?.label ?? 'Aujourd’hui';

  function openDate(which: 'start' | 'end') {
    if (process.env.EXPO_OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date', value: which === 'start' ? start : end,
        minimumDate: which === 'start' ? minimum : start,
        maximumDate: which === 'start' ? end : maximum,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) {
            if (which === 'start') setStart(dayStart(picked));
            else setEnd(dayStart(picked));
          }
        },
      });
      return;
    }
    setIosPicker(which);
  }

  return <>
    <GlassView isInteractive colorScheme="light" tintColor="rgba(255,255,255,0.25)"
      style={{ alignSelf: 'flex-start', borderRadius: 18, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.16)' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Période : ${selectedLabel}. Changer les dates`}
        onPress={() => { setStart(value.start ?? minimum); setEnd(value.end ?? maximum); setOpen(true); }}
        style={{ minHeight: 38, paddingHorizontal: 11, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <CalendarIcon />
        <Text numberOfLines={1} style={{ color: '#000000', fontSize: 11, fontWeight: '900', maxWidth: 190 }}>
          {selectedLabel.toUpperCase()}</Text>
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path d="m2 4 4 4 4-4" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </GlassView>

    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,8,31,0.65)' }}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Fermer le sélecteur de période" />
        <ScrollView contentContainerStyle={{ backgroundColor: '#201633', borderTopLeftRadius: 28,
          borderTopRightRadius: 28, padding: 22, paddingBottom: 42, gap: 10 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginBottom: 5 }}>Choisir une période</Text>
          {options.map((option) => <Pressable key={option.period} accessibilityRole="button"
            onPress={() => { onChange({ period: option.period }); setOpen(false); }}
            style={{ minHeight: 48, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#34274B',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{option.label}</Text>
            {value.period === option.period ? <View style={{ width: 8, height: 8,
              borderRadius: 4, backgroundColor: '#C8A9F9' }} /> : null}
          </Pressable>)}
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 10 }}>Dates personnalisées</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => openDate('start')}
              style={{ flex: 1, backgroundColor: '#34274B', borderRadius: 14, padding: 12 }}>
              <Text style={{ color: '#C8B7DB', fontSize: 11 }}>DU</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{dateLabel(start)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => openDate('end')}
              style={{ flex: 1, backgroundColor: '#34274B', borderRadius: 14, padding: 12 }}>
              <Text style={{ color: '#C8B7DB', fontSize: 11 }}>AU</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{dateLabel(end)}</Text>
            </Pressable>
          </View>
          {iosPicker ? <DateTimePicker value={iosPicker === 'start' ? start : end} mode="date" themeVariant="dark"
            display="inline" minimumDate={iosPicker === 'start' ? minimum : start}
            maximumDate={iosPicker === 'start' ? end : maximum}
            onChange={(_, picked) => {
              if (picked) {
                if (iosPicker === 'start') setStart(dayStart(picked));
                else setEnd(dayStart(picked));
              }
            }} /> : null}
          <Pressable accessibilityRole="button" onPress={() => {
            onChange({ period: 'custom', start, end }); setIosPicker(null); setOpen(false);
          }} style={{ backgroundColor: '#C8A9F9', borderRadius: 17, minHeight: 50,
            alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
            <Text style={{ color: '#120D2B', fontWeight: '900', fontSize: 15 }}>Voir cette période</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
