import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { useSavedPlaces } from '@/contexts/saved-places';
import { cancelLocationRequest, deliverLocation, hasPendingLocationRequest } from '@/utils/location-picker';

// Mock nearby locations — replace with real reverse-geocoding as the map center changes.
const nearbyLocations = [
  'Pentagon Hall Block C',
  'Commonwealth Hall',
  'Legon Boundary Road',
  'Night Market Junction',
  'Volta Hall',
];

const DRAG_DISTANCE_PER_LOCATION = 120; // px of cumulative drag before the location name updates

export default function SetLocationScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const isEditingLocation = !!id && mode === 'location';

  // Both conditions required. Expo Router can carry `mode=pick` over from a
  // previous navigation, so the param alone would make the Saved Places flow
  // look like a Route Hub pick and pop the user onto the wrong screen. A
  // registered handler is what actually proves a screen is waiting for a value.
  const isPickingForField = mode === 'pick' && hasPendingLocationRequest();

  const [locationIndex, setLocationIndex] = useState(0);
  const [showNameStep, setShowNameStep] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const { addPlace, updatePlace } = useSavedPlaces();
  const [sheetSlide] = useState(() => new Animated.Value(300));
  const [nameOpacity] = useState(() => new Animated.Value(1));
  const [nameStepSlide] = useState(() => new Animated.Value(300));
  const [nameOverlayOpacity] = useState(() => new Animated.Value(0));

  // Slide the location sheet up once, on mount.
  useEffect(() => {
    Animated.spring(sheetSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }).start();
  }, [sheetSlide]);

  // Any exit that isn't a confirm — swipe-back, hardware back, navigating away —
  // would otherwise leave the handler registered and poison the next visit.
  useEffect(() => {
    return () => cancelLocationRequest();
  }, []);

  const updateLocationName = (nextIndex: number) => {
    if (nextIndex === locationIndex) return;
    Animated.sequence([
      Animated.timing(nameOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(nameOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setLocationIndex(nextIndex);
  };

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const totalDrag = Math.abs(gestureState.dx) + Math.abs(gestureState.dy);
        const steps = Math.floor(totalDrag / DRAG_DISTANCE_PER_LOCATION);
        const nextIndex = steps % nearbyLocations.length;
        updateLocationName(nextIndex);
      },
    })
  );

  const handleBack = () => {
    if (showNameStep) {
      handleBackToLocation();
      return;
    }
    router.back();
  };

  const handleConfirmLocation = () => {
    // Picking a location on behalf of another screen (e.g. Route Hub): hand the
    // value back and pop, so that screen's other fields stay as the user left them.
    if (isPickingForField) {
      deliverLocation(nearbyLocations[locationIndex]);
      router.back();
      return;
    }

    // Editing an existing place's location: just update it and go
    // straight back to Saved Places — no name step needed.
    if (isEditingLocation && id) {
      updatePlace(id, { address: nearbyLocations[locationIndex] });
      router.replace('/saved-places');
      return;
    }

    setShowNameStep(true);
    Animated.parallel([
      Animated.spring(nameStepSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }),
      Animated.timing(nameOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleBackToLocation = () => {
    Animated.parallel([
      Animated.timing(nameStepSlide, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(nameOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowNameStep(false));
  };

  const [nameSheetPanResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8 && Math.abs(gestureState.dx) < 20,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          nameStepSlide.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 60) {
          handleBackToLocation();
        } else {
          Animated.spring(nameStepSlide, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 60,
          }).start();
        }
      },
    })
  );

  const handleSave = () => {
    if (!placeName.trim()) return;
    addPlace(placeName.trim(), nearbyLocations[locationIndex]);
    router.replace('/saved-places');
  };

  const canSave = placeName.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Placeholder map background — swap for react-native-maps once wired up */}
      <View style={styles.mapPlaceholder} {...panResponder.panHandlers} />

      {/* Fixed center pin — the map moves underneath it, not the pin itself */}
      <View style={styles.centerPinWrap} pointerEvents="none">
        <View style={styles.centerPinOuter}>
          <View style={styles.centerPinInner} />
        </View>
      </View>

      <SafeAreaView style={styles.topSafeArea} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Image
            source={require('@/assets/images/icons/chevron-left.png')}
            style={styles.backIcon}
            contentFit="contain"
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Step 1: pick a location */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetSlide }] }]}>
        <View style={styles.dragHandle} />

        <View style={styles.sheetTopRow}>
          <Animated.Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.locationName, { opacity: nameOpacity }]}>
            {nearbyLocations[locationIndex]}
          </Animated.Text>
          <TouchableOpacity style={styles.searchButton}>
            <Image
              source={require('@/assets/images/icons/search.png')}
              style={styles.searchIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sheetSubtitle}>Drag the map to select a location</Text>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLocation}>
          <Text style={styles.confirmButtonText}>Confirm location</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Step 2: name the place — slides up over step 1, keyboard-aware */}
      {showNameStep && (
        <>
        <Animated.View style={[styles.nameOverlayBlur, { opacity: nameOverlayOpacity }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.nameOverlayTint} pointerEvents="none" />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleBackToLocation} />
        </Animated.View>

          <KeyboardAvoidingView
            style={styles.nameSheetOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none">
            <Animated.View style={[styles.nameSheet, { transform: [{ translateY: nameStepSlide }] }]}>
            <View style={styles.dragHandle} {...nameSheetPanResponder.panHandlers} hitSlop={{ top: 15, bottom: 15, left: 40, right: 40 }} />

            <TouchableOpacity style={styles.nameSheetHeaderRow} onPress={handleBackToLocation}>
              <Image
                source={require('@/assets/images/icons/chevron-left.png')}
                style={styles.nameBackIcon}
                contentFit="contain"
              />
              <Text weight="medium" style={styles.nameSheetTitle}>Add a Name</Text>
            </TouchableOpacity>

            <Text style={styles.nameSheetLabel}>Name this new place</Text>

            <TextInput
              autoFocus
              value={placeName}
              onChangeText={setPlaceName}
              placeholder="e.g. School"
              placeholderTextColor={Palette.Placeholder}
              style={styles.nameInput}
            />

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              disabled={!canSave}
              onPress={handleSave}>
              <Text weight="medium" style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
        </>
      )}
    </View>
  );
}

// Local replacement for StyleSheet.absoluteFillObject, which is missing from the
// current type definitions. Same four properties, spread into styles below.
const fillParent = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.GrayBackground,
  },
  mapPlaceholder: {
    ...fillParent,
    backgroundColor: Palette.GrayBackground,
  },
  centerPinWrap: {
    ...fillParent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOverlayBlur: {
    ...fillParent,
  },
  nameOverlayTint: {
    ...fillParent,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  centerPinOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.LightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.CustomBlack,
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Palette.White,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    marginTop: 20,
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
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.White,
    borderRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    margin: 20,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: Palette.LightGray,
    marginBottom: 20,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  locationName: {
    flex: 1,
    fontSize: 24,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_500Medium',
    marginRight: 20,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    width: 24,
    height: 24,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Palette.DarkGray,
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
  nameSheetOverlay: {
    ...fillParent,
    justifyContent: 'flex-end',
  },
  nameSheet: {
    backgroundColor: Palette.White,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nameSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  nameBackIcon: {
    width: 30,
    height: 30,
  },
  nameSheetTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
  },
  nameSheetLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Palette.CustomBlack,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Palette.LightGray,
  },
  saveButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
});