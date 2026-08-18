import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';

// Mock destination data — replace with real Places/Geocoding results later.
const mockDestinations = [
  { id: '1', name: 'University of Professional Studies, Accra (UPSA)', address: 'New Road, Madina, Ghana', distance: '19.7 km' },
  { id: '2', name: 'University of Ghana', address: 'Legon Boundary Road, Ghana', distance: '2.9 km' },
  { id: '3', name: 'University of Ghana Sports Stadium', address: 'Academic Freedom Road, Ghana', distance: '19.7 km' },
  { id: '4', name: 'University of Ghana Medical Centre', address: 'Adamafio Link, Ghana', distance: '19.7 km' },
  { id: '5', name: 'UNIIK Foods', address: 'Adenta Municipality, Ghana', distance: '10.0 km' },
];

// Mock current location text — replace with real reverse-geocoded location later.
const currentLocationLabel = 'Adenta Municipality';

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

  const filteredResults = query.trim().length > 0
    ? mockDestinations.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  const handleSelect = (destinationName: string) => {
    router.push({
      pathname: '/map',
      params: { origin: currentLocationLabel, destination: destinationName },
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
          {query.trim().length > 0 && (
            <View style={styles.resultsList}>
              {filteredResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultRow}
                  onPress={() => handleSelect(item.name)}>
                  <View style={styles.resultIconGroup}>
                    <Image
                      source={require('@/assets/images/icons/location-result.png')}
                      style={styles.resultPinIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.resultDistance}>{item.distance}</Text>
                  </View>
                  <View style={styles.resultTextGroup}>
                    <HighlightedName name={item.name} query={query.trim()} />
                    <Text style={styles.resultAddress}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Set location on map */}
          <TouchableOpacity style={styles.row}>
            <Image
              source={require('@/assets/images/icons/map-pinned.png')}
              style={styles.rowIcon}
              contentFit="contain"
            />
            <Text style={styles.rowText}>Set location on map</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Saved places */}
          <TouchableOpacity style={styles.row}>
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
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: Palette.Black,
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
});