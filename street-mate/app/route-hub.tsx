import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { requestLocation } from '@/utils/location-picker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Fare input rules — adjust these rather than the logic below.
const CURRENCY_PREFIX = 'GH¢';
const MAX_DECIMAL_PLACES = 2; // real currency: 5 → 5.00
const MAX_WHOLE_DIGITS = 3; // caps fares below 1000

export default function RouteHubScreen() {
  const [activeTab, setActiveTab] = useState<'add' | 'request'>('add');

  // Shared fields
  const [startingPoint, setStartingPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');

  // Add a Route fields
  const [estimatedFare, setEstimatedFare] = useState('');
  const [fareFocused, setFareFocused] = useState(false);
  const [stops, setStops] = useState<string[]>([]);

  // Request a Route fields
  const [note, setNote] = useState('');

  // Field picker sheet (Starting point / End point)
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [fieldQuery, setFieldQuery] = useState('');
  const [fieldSheetSlide] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [fieldOverlayOpacity] = useState(() => new Animated.Value(0));

  // Show the currency prefix as soon as the field is tapped, and keep it
  // visible once a value exists so the number never reads as unitless.
  const showFarePrefix = fareFocused || estimatedFare.length > 0;

  const handleSwap = () => {
    setStartingPoint(endPoint);
    setEndPoint(startingPoint);
  };

  const handleAddStop = () => {
    setStops((prev) => [...prev, '']);
  };

  const handleUpdateStop = (index: number, value: string) => {
    setStops((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const handleRemoveStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTabChange = (tab: 'add' | 'request') => {
    setActiveTab(tab);
  };

  // Filters keystrokes as they arrive: digits and a single decimal point only,
  // capped at MAX_WHOLE_DIGITS before the point and MAX_DECIMAL_PLACES after.
  // Numeric keyboards still allow pasting, so this can't be left to keyboardType.
  const handleFareChange = (raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, '');

    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      // Keep the first decimal point, drop any others.
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }

    const [whole = '', decimals = ''] = cleaned.split('.');
    let next = whole.slice(0, MAX_WHOLE_DIGITS);
    if (firstDot !== -1) {
      next += '.' + decimals.slice(0, MAX_DECIMAL_PLACES);
    }

    setEstimatedFare(next);
  };

  // Formats to real currency when focus leaves: 5 → 5.00, 5.1 → 5.10
  const handleFareBlur = () => {
    setFareFocused(false);

    const value = parseFloat(estimatedFare);
    if (Number.isNaN(value)) {
      // Covers an empty field or a lone "." — clear it rather than showing NaN.
      setEstimatedFare('');
      return;
    }
    setEstimatedFare(value.toFixed(MAX_DECIMAL_PLACES));
  };

  const openFieldSheet = (field: 'start' | 'end') => {
    setActiveField(field);
    setFieldQuery('');
    Animated.parallel([
      Animated.timing(fieldOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(fieldSheetSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }),
    ]).start();
  };

  const closeFieldSheet = () => {
    Animated.parallel([
      Animated.timing(fieldOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fieldSheetSlide, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => setActiveField(null));
  };

  const selectFieldValue = (value: string) => {
    if (activeField === 'start') setStartingPoint(value);
    if (activeField === 'end') setEndPoint(value);
    closeFieldSheet();
  };

  const handleSetLocationOnMap = () => {
    // Capture which field asked before closeFieldSheet clears activeField.
    const field = activeField;

    requestLocation((value) => {
      if (field === 'start') setStartingPoint(value);
      if (field === 'end') setEndPoint(value);
    });

    closeFieldSheet();
    router.push({ pathname: '/set-location', params: { mode: 'pick' } });
  };

  const fareValue = parseFloat(estimatedFare);
  const hasValidFare = !Number.isNaN(fareValue) && fareValue > 0;

  const canSaveAddRoute = startingPoint.trim().length > 0 && endPoint.trim().length > 0 && hasValidFare;
  const canSaveRequestRoute = startingPoint.trim().length > 0 && endPoint.trim().length > 0;
  const canSave = activeTab === 'add' ? canSaveAddRoute : canSaveRequestRoute;

  const handleSave = () => {
    if (!canSave) return;
    // Replace with a real submission to your backend/data store once available.
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={require('@/assets/images/icons/chevron-left.png')}
            style={styles.backIcon}
            contentFit="contain"
          />
        </TouchableOpacity>
        <Text weight="medium" style={styles.headerTitle}>Route Hub</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => handleTabChange('add')}>
          <Text weight="semibold" style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            ADD A ROUTE
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'request' && styles.tabActive]}
          onPress={() => handleTabChange('request')}>
          <Text weight="semibold" style={[styles.tabText, activeTab === 'request' && styles.tabTextActive]}>
            REQUEST A ROUTE
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.pointsRow}>
            <TouchableOpacity style={styles.pointInputTouchable} activeOpacity={0.8} onPress={() => openFieldSheet('start')}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={startingPoint ? styles.pointInputFilledText : styles.pointInputPlaceholder}>
                {startingPoint || 'Starting point'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
              <Image
                source={require('@/assets/images/icons/arrow-swap-20-regular.png')}
                style={styles.swapIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pointInputTouchable} activeOpacity={0.8} onPress={() => openFieldSheet('end')}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={endPoint ? styles.pointInputFilledText : styles.pointInputPlaceholder}>
                {endPoint || 'End point'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'add' ? (
            <>
              <View style={styles.fareInputWrap}>
                {showFarePrefix && (
                  <Text style={styles.farePrefix}>{CURRENCY_PREFIX}</Text>
                )}
                <TextInput
                  value={estimatedFare}
                  onChangeText={handleFareChange}
                  onFocus={() => setFareFocused(true)}
                  onBlur={handleFareBlur}
                  placeholder={showFarePrefix ? '0.00' : 'Estimated Fare (GH¢)'}
                  placeholderTextColor={Palette.Placeholder}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  style={styles.fareInput}
                />
              </View>

              <Text weight="semibold" style={styles.sectionLabel}>Add Intermediate Stops</Text>

              {stops.map((stop, index) => (
                <View key={index} style={styles.stopRow}>
                  <TextInput
                    value={stop}
                    onChangeText={(value) => handleUpdateStop(index, value)}
                    placeholder={`Stop ${index + 1}`}
                    placeholderTextColor={Palette.Placeholder}
                    style={styles.stopInput}
                  />
                  <TouchableOpacity style={styles.removeStopButton} onPress={() => handleRemoveStop(index)}>
                    <Text weight="bold" style={styles.removeStopButtonText}>−</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addStopsButton} onPress={handleAddStop}>
                <Image
                  source={require('@/assets/images/icons/add-20-regular.png')}
                  style={styles.addStopsIcon}
                  contentFit="contain"
                />
                <Text style={styles.addStopsText}>Add Stops</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text weight="semibold" style={styles.sectionLabel}>Tell us more (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Is there anything else we should know about this missing route?"
                placeholderTextColor={Palette.Placeholder}
                multiline
                textAlignVertical="top"
                style={styles.noteInput}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.saveButtonWrap}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            disabled={!canSave}
            onPress={handleSave}>
            <Text weight="medium" style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {activeField && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.fieldOverlay, { opacity: fieldOverlayOpacity }]}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFieldSheet} />
          </Animated.View>

          <Animated.View style={[styles.fieldSheet, { transform: [{ translateY: fieldSheetSlide }] }]}>
            <View style={styles.dragHandle} />

            <TouchableOpacity style={styles.fieldSheetHeaderRow} onPress={closeFieldSheet}>
              <Image
                source={require('@/assets/images/icons/chevron-left.png')}
                style={styles.fieldSheetBackIcon}
                contentFit="contain"
              />
              <Text weight="semibold" style={styles.fieldSheetTitle}>
                {activeField === 'start' ? 'Starting Point' : 'End Point'}
              </Text>
            </TouchableOpacity>

            <View style={styles.fieldSearchWrap}>
              <TextInput
                autoFocus
                value={fieldQuery}
                onChangeText={setFieldQuery}
                onSubmitEditing={() => fieldQuery.trim() && selectFieldValue(fieldQuery.trim())}
                placeholder="Search for stops"
                placeholderTextColor={Palette.Placeholder}
                style={styles.fieldSearchInput}
              />
            </View>

            <TouchableOpacity style={styles.fieldOptionRow} onPress={() => selectFieldValue('Current Location')}>
              <Image
                source={require('@/assets/images/icons/map-pin.png')}
                style={styles.fieldOptionIcon}
                contentFit="contain"
              />
              <Text style={styles.fieldOptionText}>Current Location</Text>
            </TouchableOpacity>

            <View style={styles.fieldDivider} />

            <TouchableOpacity style={styles.fieldOptionRow} onPress={handleSetLocationOnMap}>
              <Image
                source={require('@/assets/images/icons/map-pinned.png')}
                style={styles.fieldOptionIcon}
                contentFit="contain"
              />
              <Text style={styles.fieldOptionText}>Set location on map</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.White,
  },
  flexFill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    width: 30,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
  },
  tabText: {
    fontSize: 13,
    color: Palette.DarkGray,
  },
  tabTextActive: {
    color: Palette.CustomBlack,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pointInputTouchable: {
    flex: 1,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  pointInputPlaceholder: {
    fontSize: 15,
    color: Palette.Placeholder,
    fontFamily: 'Poppins_400Regular',
  },
  pointInputFilledText: {
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
  },
  swapButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    width: 20,
    height: 20,
  },
  fareInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  farePrefix: {
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_500Medium',
  },
  fareInput: {
    flex: 1,
    padding: 0,
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
  },
  sectionLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stopInput: {
    flex: 1,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  removeStopButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.Red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeStopButtonText: {
    color: Palette.White,
    fontSize: 18,
    lineHeight: 20,
  },
  addStopsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
  },
  addStopsIcon: {
    width: 18,
    height: 18,
  },
  addStopsText: {
    fontSize: 15,
    color: Palette.DarkGray,
  },
  noteInput: {
    backgroundColor: Palette.White,
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
    height: 150,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Palette.Placeholder,
  },
  saveButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
  fieldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  fieldSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 100,
    backgroundColor: Palette.White,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: Palette.LightGray,
    marginBottom: 20,
  },
  fieldSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  fieldSheetBackIcon: {
    width: 24,
    height: 24,
  },
  fieldSheetTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
  },
  fieldSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  fieldSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
  },
  fieldSearchMapIcon: {
    width: 20,
    height: 20,
  },
  fieldOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  fieldOptionIcon: {
    width: 20,
    height: 20,
  },
  fieldOptionText: {
    fontSize: 15,
    color: Palette.CustomBlack,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Palette.LightGray,
  },
});