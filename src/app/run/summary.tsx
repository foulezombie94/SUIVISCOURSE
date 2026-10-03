import { useLocalSearchParams } from 'expo-router';
import { RunSummaryScreen } from '@/features/activities/run-summary-screen';
export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RunSummaryScreen id={id ?? ''} />;
}
