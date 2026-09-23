import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Image as RNImage, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { CURRENT_LOCATION, stopsInRegion } from '@/data/stops';

// Each Marker is a native view, so the full dataset cannot be rendered at once.
const MAX_VISIBLE_STOPS = 120;

const INITIAL_REGION: Region = {
  latitude: CURRENT_LOCATION.lat,
  longitude: CURRENT_LOCATION.lng,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function StopsMapScreen() {
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const visibleStops = stopsInRegion(region, MAX_VISIBLE_STOPS);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}>
        {visibleStops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.name}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}>
            <RNImage
              source={require('@/assets/images/icons/bus-stop.png')}
              style={styles.stopMarkerIcon}
              resizeMode="contain"
            />
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.topSafeArea} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={require('@/assets/images/icons/chevron-left.png')}
              style={styles.backIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <Text weight="medium" style={styles.topBarText} numberOfLines={1}>
            {visibleStops.length} stops in view
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.GrayBackground,
  },
  stopMarkerIcon: {
    width: 26,
    height: 26,
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.White,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  topBarText: {
    flex: 1,
    fontSize: 14,
    color: Palette.CustomBlack,
  },
});