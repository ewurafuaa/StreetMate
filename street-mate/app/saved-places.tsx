import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { useEffect, useRef, useState } from 'react';
import { useSavedPlaces } from '@/contexts/saved-places';

const iconMap = {
  home: require('@/assets/images/icons/home-20-regular.png'),
  work: require('@/assets/images/icons/briefcase-20-regular.png'),
  star: require('@/assets/images/icons/star-20-regular.png'),
};

const editNameIcon = require('@/assets/images/icons/PencilOutline.png');
const editLocationIcon = require('@/assets/images/icons/location-20-regular.png');
const deleteIcon = require('@/assets/images/icons/TrashOutline.png');

const SHEET_OFFSET = 320;
const NAME_SHEET_OFFSET = 300;

type SavedPlace = ReturnType<typeof useSavedPlaces>['places'][number];

export default function SavedPlacesScreen() {
  const { places, removePlace, updatePlace } = useSavedPlaces();

  const [activePlace, setActivePlace] = useState<SavedPlace | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedPlace | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_OFFSET)).current;

  const openSheet = (place: SavedPlace) => {
    translateY.setValue(SHEET_OFFSET);
    setActivePlace(place);
  };

  const animateIn = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
      mass: 0.6,
    }).start();
  };

  // Kick off the slide-up the moment the sheet is requested, rather than
  // waiting on the Modal's own native transition ("onShow") to finish
  // first. That extra hand-off is what caused the visible delay.
  useEffect(() => {
    if (activePlace) {
      requestAnimationFrame(animateIn);
    }
  }, [activePlace]);

  const closeSheet = (after?: (place: SavedPlace) => void) => {
    const place = activePlace;
    Animated.timing(translateY, {
      toValue: SHEET_OFFSET,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setActivePlace(null);
      if (place && after) after(place);
    });
  };

  // Rename sheet — mirrors the "name this place" step used on the
  // add/edit-location screen.
  const nameSheetSlide = useRef(new Animated.Value(NAME_SHEET_OFFSET)).current;
  const nameOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (renameTarget) {
      nameSheetSlide.setValue(NAME_SHEET_OFFSET);
      nameOverlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(nameSheetSlide, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 60,
        }),
        Animated.timing(nameOverlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [renameTarget]);

  const closeRenameSheet = () => {
    Animated.parallel([
      Animated.timing(nameSheetSlide, {
        toValue: NAME_SHEET_OFFSET,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nameOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setRenameTarget(null));
  };

  const handleEditName = () => {
    closeSheet((place) => {
      setRenameValue(place.label);
      setRenameTarget(place);
    });
  };

  const handleEditLocation = () => {
    closeSheet((place) => {
      router.push({ pathname: '/add-place', params: { id: place.id, mode: 'location' } });
    });
  };

  const handleDelete = () => {
    closeSheet((place) => removePlace(place.id));
  };

  const handleSaveName = () => {
    const trimmed = renameValue.trim();
    if (renameTarget && trimmed.length > 0) {
      updatePlace(renameTarget.id, { label: trimmed });
    }
    closeRenameSheet();
  };

  const handleAddPlace = () => {
    router.push('/add-place');
  };

  const canSaveName = renameValue.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Image
            source={require('@/assets/images/icons/chevron-left.png')}
            style={styles.backIcon}
            contentFit="contain"
          />
        </TouchableOpacity>
        <Text weight="medium" style={styles.headerTitle}>Saved Places</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.list}>
        {places.map((place) => {
          const hasAddress = place.address.trim().length > 0;
          return (
            <View key={place.id} style={styles.rowWrapper}>
              <TouchableOpacity
                style={styles.rowInner}
                activeOpacity={0.6}
                onPress={() =>
                  hasAddress
                    ? openSheet(place)
                    : router.push({ pathname: '/add-place', params: { id: place.id, mode: 'location' } })
                }
              >
                <Image source={iconMap[place.icon]} style={styles.placeIcon} contentFit="contain" />
                <View style={styles.placeTextGroup}>
                  <Text weight="medium" style={styles.placeLabel}>
                    {hasAddress ? place.label : `Add ${place.label}`}
                  </Text>
                  {hasAddress && <Text style={styles.placeAddress}>{place.address}</Text>}
                </View>
                <Image
                  source={require('@/assets/images/icons/chevron-left.png')}
                  style={styles.chevronRight}
                  contentFit="contain"
                />
              </TouchableOpacity>
              <View style={styles.divider} />
            </View>
          );
        })}

        <TouchableOpacity style={styles.rowInner} onPress={handleAddPlace}>
          <Image
            source={require('@/assets/images/icons/add-20-regular.png')}
            style={styles.placeIcon}
            contentFit="contain"
          />
          <Text weight="regular" style={styles.addPlaceLabel}>Add a place</Text>
        </TouchableOpacity>
      </View>

      {/* Action sheet */}
      <Modal
        visible={!!activePlace}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet()}
      >
        <Pressable style={styles.backdrop} onPress={() => closeSheet()} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grabber} />

          <Text weight="medium" style={styles.sheetTitle} numberOfLines={1}>
            {activePlace?.label}
          </Text>
          <Text style={styles.sheetSubtitle} numberOfLines={1}>
            {activePlace?.address}
          </Text>

          {activePlace?.icon === 'star' && (
            <>
              <TouchableOpacity style={styles.sheetOption} onPress={handleEditName}>
                <Image source={editNameIcon} style={styles.sheetOptionIcon} contentFit="contain" />
                <Text style={styles.sheetOptionText}>Edit name</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          <TouchableOpacity style={styles.sheetOption} onPress={handleEditLocation}>
            <Image source={editLocationIcon} style={styles.sheetOptionIcon} contentFit="contain" />
            <Text style={styles.sheetOptionText}>Edit location</Text>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.sheetOption} onPress={handleDelete}>
            <Image source={deleteIcon} style={styles.sheetOptionIcon} contentFit="contain" tintColor={Palette.Red} />
            <Text weight="medium" style={styles.sheetOptionDelete}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Rename sheet — styled to match the "Add a Name" step on set-location */}
      <Modal
        visible={!!renameTarget}
        transparent
        animationType="none"
        onRequestClose={closeRenameSheet}
      >
        <Animated.View style={[styles.nameOverlayBlur, { opacity: nameOverlayOpacity }]}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.nameOverlayTint} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeRenameSheet} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.nameSheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.nameSheet, { transform: [{ translateY: nameSheetSlide }] }]}>
            <View style={styles.dragHandle} />

            <TouchableOpacity style={styles.nameSheetHeaderRow} onPress={closeRenameSheet}>
              <Image
                source={require('@/assets/images/icons/chevron-left.png')}
                style={styles.nameBackIcon}
                contentFit="contain"
              />
              <Text weight="medium" style={styles.nameSheetTitle}>Edit Name</Text>
            </TouchableOpacity>

            <Text style={styles.nameSheetLabel}>Name this place</Text>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              selectTextOnFocus
              placeholder="e.g. School"
              placeholderTextColor={Palette.Placeholder ?? Palette.DarkGray}
              style={styles.nameInput}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />

            <TouchableOpacity
              style={[styles.saveButton, !canSaveName && styles.saveButtonDisabled]}
              disabled={!canSaveName}
              onPress={handleSaveName}
            >
              <Text weight="medium" style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.White,
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
  list: {
    paddingHorizontal: 20,
  },
  rowWrapper: {
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 15,
    width: '100%',
  },
  placeIcon: {
    width: 24,
    height: 24,
  },
  chevronRight: {
    width: 22,
    height: 22,
    transform: [{ rotate: '180deg' }],
    opacity: 0.5,
  },
  placeTextGroup: {
    flex: 1,
  },
  placeLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  placeAddress: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  addPlaceLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: Palette.LightGray,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.White,
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: Palette.LightGray,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Palette.DarkGray,
    marginBottom: 10,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  sheetOptionIcon: {
    width: 20,
    height: 20,
  },
  sheetOptionText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  sheetOptionDelete: {
    fontSize: 16,
    color: Palette.Red,
  },
  nameOverlayBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  nameOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  nameSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: Palette.LightGray,
    marginBottom: 20,
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