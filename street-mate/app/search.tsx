import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { CURRENT_LOCATION, formatDistance, searchStops, type StopResult } from '@/data/stops';

function HighlightedName({ name, query }: { name: string; query: string }) {
  if (!query) {
    return <Text numberOfLines={1} style={styles.resultName}>{name}</Text>;
  }
  const index = name.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return <Text numberOfLines={1} style={styles.resultName}>{name}</Text>;
  }
  const before = name.slice(0, index);
  const match = name.slice(index, index + query.length);
  const after = name.slice(index + query.length);
  return (
    <Text numberOfLines={1} style={styles.resultName}>
      {before}
      <Text weight="bold" style={styles.resultName}>{match}</Text>
      {after}
    </Text>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  // Real lookup over the OSM stop dataset, ranked by name match then proximity.
  // useMemo keeps the scan off the render path while the user types.
  const filteredResults = useMemo(() => searchStops(query, CURRENT_LOCATION), [query]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // Coordinates travel with the selection so the map can centre on the
  // destination without having to resolve the name a second time.
  const handleSelect = (stop: StopResult) => {
    router.push({
      pathname: '/map',
      params: {
        origin: CURRENT_LOCATION.name,
        destination: stop.name,
        destLat: String(stop.lat),
        destLng: String(stop.lng),
        originLat: String(CURRENT_LOCATION.lat),
        originLng: String(CURRENT_LOCATION.lng),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={require('@/assets/images/icons/chevron-left.png')}
              style={styles.backIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <Text weight="medium" style={styles.headerTitle}>Your Route</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Current location pill */}
        <View style={styles.currentLocationPill}>
          <Image
            source={require('@/assets/images/icons/map-pin.png')}
            style={styles.pillIcon}
            contentFit="contain"
          />
          <Text style={styles.currentLocationText}>Current location</Text>
        </View>

        {/* Search input */}
        <View style={styles.searchInputWrap}>
          <Image
            source={require('@/assets/images/icons/search.png')}
            style={styles.searchIcon}
            contentFit="contain"
          />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search a destination"
            placeholderTextColor={Palette.Placeholder}
            style={styles.searchInput}
          />
        </View>

        {/* Scrollable content: results + the two static options below them */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {hasQuery && (
            <View style={styles.resultsList}>
              {filteredResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultRow}
                  onPress={() => handleSelect(item)}>
                  <View style={styles.resultIconGroup}>
                    <Image
                      source={require('@/assets/images/icons/location-result.png')}
                      style={styles.resultPinIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.resultDistance}>{formatDistance(item.distanceKm)}</Text>
                  </View>
                  <View style={styles.resultTextGroup}>
                    <HighlightedName name={item.name} query={trimmedQuery} />
                    <Text style={styles.resultAddress}>Bus stop</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {filteredResults.length === 0 && (
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>No stops match that name.</Text>
                  <Text style={styles.emptyResultsHint}>
                    Try a nearby landmark or junction instead.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Set location on map */}
          <TouchableOpacity style={styles.row} onPress={() => router.push('/stops-map')}>
            <Image
              source={require('@/assets/images/icons/map-pinned.png')}
              style={styles.rowIcon}
              contentFit="contain"
            />
            <Text style={styles.rowText}>Set location on map</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Saved places */}
          <TouchableOpacity style={styles.row} onPress={() => router.push('/saved-places')}>
            <Image
              source={require('@/assets/images/icons/map-pin-house.png')}
              style={styles.rowIcon}
              contentFit="contain"
            />
            <Text style={styles.rowText}>Saved places</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.White,
    paddingHorizontal: 20,
  },
  keyboardAvoider: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
  },
  headerSpacer: {
    width: 24,
  },
  currentLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  pillIcon: {
    width: 20,
    height: 20,
  },
  currentLocationText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 10,
    shadowColor: Palette.CustomBlack,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  rowIcon: {
    width: 20,
    height: 20,
  },
  rowText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.LightGray,
  },
  resultsList: {
    marginTop: 0,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Palette.LightGray,
  },
  resultIconGroup: {
    alignItems: 'center',
    width: 50,
  },
  resultPinIcon: {
    width: 20,
    height: 20,
  },
  resultDistance: {
    fontSize: 12,
    color: Palette.DarkGray,
    marginTop: 5,
  },
  resultTextGroup: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    color: Palette.CustomBlack,
    lineHeight: 22,
  },
  resultAddress: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  emptyResults: {
    paddingVertical: 20,
  },
  emptyResultsText: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 5,
  },
  emptyResultsHint: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
});