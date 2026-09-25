import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { CURRENT_LOCATION, formatDistance } from '@/data/stops';
import { useCurrentLocation } from '@/hooks/use-current-location';
import {
  autocompletePlaces,
  getPlaceLocation,
  newSessionToken,
  PlacesError,
  reverseGeocode,
  type PlaceSuggestion,
} from '@/utils/places';

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

type Field = 'origin' | 'destination';
type Point = { lat: number; lng: number };
type CustomOrigin = Point & { name: string };

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

// Used only when the phone's location is switched off or unavailable.
const FALLBACK_POINT: Point = { lat: CURRENT_LOCATION.lat, lng: CURRENT_LOCATION.lng };

export default function SearchScreen() {
  const { coords, status } = useCurrentLocation();

  // Origin field
  const [originMode, setOriginMode] = useState<'current' | 'custom'>('current');
  const [customOrigin, setCustomOrigin] = useState<CustomOrigin | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [originFocused, setOriginFocused] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Destination field
  const [destQuery, setDestQuery] = useState('');

  // Shared search state: only one field is active at a time
  const [activeField, setActiveField] = useState<Field>('destination');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const originInputRef = useRef<TextInput>(null);
  const destInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0); // lets a slow, older response be ignored
  const sessionTokenRef = useRef<string | null>(null);
  const addressKeyRef = useRef<string | null>(null); // which GPS spot currentAddress belongs to
  const skipFocusSearchRef = useRef(false); // set when we move focus to the destination ourselves

  // Stops a pending search from firing after the screen is closed.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Where the rider is starting from, for the map and for ranking results.
  const gpsPoint: Point = coords ?? FALLBACK_POINT;
  const originPoint: Point = originMode === 'custom' && customOrigin ? customOrigin : gpsPoint;
  const originLabel =
    originMode === 'custom' && customOrigin
      ? customOrigin.name
      : coords
        ? 'Current location'
        : CURRENT_LOCATION.name;

  // What the origin box shows while it is NOT being edited.
  const originDisplay =
    originMode === 'custom' && customOrigin
      ? customOrigin.name
      : status === 'loading'
        ? 'Finding your location…'
        : coords
          ? 'Current location'
          : 'Location off. Using a default area';

  const activeQuery = (activeField === 'origin' ? originQuery : destQuery).trim();

  const resetSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    setSuggestions([]);
    setSearching(false);
    setHasSearched(false);
    setError(null);
  };

  const runSearch = async (text: string, center: Point) => {
    const requestId = ++requestIdRef.current;
    const token = sessionTokenRef.current ?? newSessionToken();
    sessionTokenRef.current = token;

    try {
      const results = await autocompletePlaces(text, center, token);
      if (requestId !== requestIdRef.current) return;
      setSuggestions(results);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setError(e instanceof PlacesError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) {
        setSearching(false);
        setHasSearched(true);
      }
    }
  };

  const startSearch = (text: string, center: Point, delay: number = DEBOUNCE_MS) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1; // cancels any search still in flight
      setSuggestions([]);
      setSearching(false);
      setHasSearched(false);
      setError(null);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => runSearch(trimmed, center), delay);
  };

  // --- Origin field ---------------------------------------------------------

  const handleOriginFocus = async () => {
    setOriginFocused(true);
    setActiveField('origin');
    resetSearch();

    if (originMode === 'custom' && customOrigin) {
      setOriginQuery(customOrigin.name);
      return;
    }
    if (!coords) {
      setOriginQuery(status === 'loading' ? '' : CURRENT_LOCATION.name);
      return;
    }

    // Tapping "Current location" swaps the label for the real address.
    const key = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
    if (currentAddress && addressKeyRef.current === key) {
      setOriginQuery(currentAddress);
      return;
    }

    setOriginQuery('');
    setResolvingAddress(true);
    const address = await reverseGeocode(coords.lat, coords.lng);
    addressKeyRef.current = key;
    setCurrentAddress(address);
    setResolvingAddress(false);
    // Only fill it in if the rider hasn't already started typing something else.
    setOriginQuery((prev) => (prev === '' ? address : prev));
  };

  const handleOriginBlur = () => {
    setOriginFocused(false);
  };

  const handleOriginChange = (text: string) => {
    setOriginQuery(text);
    startSearch(text, gpsPoint);
  };

  const handleUseCurrentLocation = () => {
    setOriginMode('current');
    setCustomOrigin(null);
    resetSearch();
    skipFocusSearchRef.current = true;
    originInputRef.current?.blur();
    destInputRef.current?.focus();
    if (destQuery.trim().length >= MIN_QUERY_LENGTH) startSearch(destQuery, gpsPoint, 0);
  };

  // --- Destination field ----------------------------------------------------

  const handleDestFocus = () => {
    setActiveField('destination');
    if (skipFocusSearchRef.current) {
      skipFocusSearchRef.current = false;
      return;
    }
    resetSearch();
    if (destQuery.trim().length >= MIN_QUERY_LENGTH) startSearch(destQuery, originPoint, 0);
  };

  const handleDestChange = (text: string) => {
    setDestQuery(text);
    startSearch(text, originPoint);
  };

  // --- Picking a result -----------------------------------------------------

  // A suggestion has no coordinates yet, so one more call fetches them first.
  const handleSelect = async (item: PlaceSuggestion) => {
    if (resolvingId) return;
    setResolvingId(item.placeId);
    setError(null);

    try {
      const place = await getPlaceLocation(item.placeId, sessionTokenRef.current ?? undefined);
      sessionTokenRef.current = null; // session finished; the next search starts a new one

      if (activeField === 'origin') {
        // The rider chose a different starting point. Move on to the destination box.
        const picked: CustomOrigin = { name: item.name, lat: place.lat, lng: place.lng };
        setCustomOrigin(picked);
        setOriginMode('custom');
        resetSearch();
        skipFocusSearchRef.current = true;
        originInputRef.current?.blur();
        destInputRef.current?.focus();
        if (destQuery.trim().length >= MIN_QUERY_LENGTH) startSearch(destQuery, picked, 0);
      } else {
        router.push({
          pathname: '/map',
          params: {
            origin: originLabel,
            destination: item.name,
            destLat: String(place.lat),
            destLng: String(place.lng),
            originLat: String(originPoint.lat),
            originLng: String(originPoint.lng),
          },
        });
      }
    } catch (e) {
      setError(e instanceof PlacesError ? e.message : "Couldn't open that place. Please try again.");
    } finally {
      setResolvingId(null);
    }
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

        {/* Starting point: shows "Current location", the real address once tapped, or a chosen place */}
        <View style={[styles.currentLocationPill, originFocused && styles.pillFocused]}>
          <Image
            source={require('@/assets/images/icons/map-pin.png')}
            style={styles.pillIcon}
            contentFit="contain"
          />
          <TextInput
            ref={originInputRef}
            value={originFocused ? originQuery : originDisplay}
            onChangeText={handleOriginChange}
            onFocus={handleOriginFocus}
            onBlur={handleOriginBlur}
            selectTextOnFocus
            returnKeyType="search"
            placeholder={resolvingAddress ? 'Finding your address…' : 'Search a starting point'}
            placeholderTextColor={Palette.Placeholder}
            style={styles.currentLocationText}
          />
          {originFocused && resolvingAddress && (
            <ActivityIndicator size="small" color={Palette.DarkGray} />
          )}
        </View>

        {/* Destination input */}
        <View style={[styles.searchInputWrap, originFocused && styles.searchInputWrapInactive]}>
          <Image
            source={require('@/assets/images/icons/search.png')}
            style={styles.searchIcon}
            contentFit="contain"
          />
          <TextInput
            ref={destInputRef}
            autoFocus
            value={destQuery}
            onChangeText={handleDestChange}
            onFocus={handleDestFocus}
            placeholder="Search a destination"
            placeholderTextColor={Palette.Placeholder}
            style={styles.searchInput}
          />
          {searching && activeField === 'destination' && (
            <ActivityIndicator size="small" color={Palette.DarkGray} />
          )}
        </View>

        {/* Scrollable content: results + the static options below them */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Lets the rider return to GPS after choosing a different starting point */}
          {activeField === 'origin' && originFocused && originMode === 'custom' && (
            <>
              <TouchableOpacity style={styles.row} onPress={handleUseCurrentLocation}>
                <Image
                  source={require('@/assets/images/icons/map-pin.png')}
                  style={styles.rowIcon}
                  contentFit="contain"
                />
                <Text style={styles.rowText}>Use current location</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.resultsList}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.placeId}
                style={styles.resultRow}
                disabled={resolvingId !== null}
                onPress={() => handleSelect(item)}>
                <View style={styles.resultIconGroup}>
                  <Image
                    source={require('@/assets/images/icons/location-result.png')}
                    style={styles.resultPinIcon}
                    contentFit="contain"
                  />
                  {item.distanceMeters != null && (
                    <Text style={styles.resultDistance}>{formatDistance(item.distanceMeters / 1000)}</Text>
                  )}
                </View>
                <View style={styles.resultTextGroup}>
                  <HighlightedName name={item.name} query={activeQuery} />
                  {item.secondary ? (
                    <Text numberOfLines={1} style={styles.resultAddress}>{item.secondary}</Text>
                  ) : null}
                </View>
                {resolvingId === item.placeId && (
                  <ActivityIndicator size="small" color={Palette.DarkGray} />
                )}
              </TouchableOpacity>
            ))}

            {error && (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyResultsText}>{error}</Text>
              </View>
            )}

            {hasSearched && !searching && !error && suggestions.length === 0 && (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyResultsText}>No places match that search.</Text>
                <Text style={styles.emptyResultsHint}>
                  Try a nearby landmark, junction or area name instead.
                </Text>
              </View>
            )}

            {suggestions.length > 0 && <Text style={styles.attribution}>Powered by Google</Text>}
          </View>

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
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  pillFocused: {
    borderColor: Palette.CustomBlack,
  },
  searchInputWrapInactive: {
    borderColor: 'transparent',
  },
  pillIcon: {
    width: 20,
    height: 20,
  },
  currentLocationText: {
    flex: 1,
    padding: 0,
    fontSize: 16,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
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
    alignItems: 'center',
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
  attribution: {
    fontSize: 12,
    color: Palette.DarkGray,
    textAlign: 'right',
    paddingTop: 10,
    paddingBottom: 5,
  },
});