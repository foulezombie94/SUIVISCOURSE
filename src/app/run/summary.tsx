import { useLocalSearchParams } from 'expo-router';
import { ActivityDetail } from '@/components/activity-detail';
export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivityDetail id={id ?? ''} finished />;
}
