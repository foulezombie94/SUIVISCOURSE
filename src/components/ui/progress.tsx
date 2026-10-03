import { createProgress } from '@gluestack-ui/core/progress/creator';
import { View } from 'react-native';

export const Progress = createProgress({ Root: View, FilledTrack: View });
export const ProgressFilledTrack = Progress.FilledTrack;
