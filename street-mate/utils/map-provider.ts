import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PROVIDER_GOOGLE } from 'react-native-maps';

// Expo Go can't reliably draw the Google provider (blank map on react-native-maps 1.27.2),
// so it falls back to the platform default there. Real builds use Google Maps on both platforms.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const MAP_PROVIDER = isExpoGo ? undefined : PROVIDER_GOOGLE;