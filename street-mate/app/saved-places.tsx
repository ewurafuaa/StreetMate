import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';

const savedPlacesData = [
  { id: '1', label: 'Home', icon: require('@/assets/images/icons/home-20-regular.png') },
  { id: '2', label: 'Work', icon: require('@/assets/images/icons/briefcase-20-regular.png') },
];

export default function SavedPlacesScreen() {
  const [places, setPlaces] = useState(savedPlacesData);
  const [isEditing, setIsEditing] = useState(false);

  const handleRemove = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddPlace = () => {
    router.push('/add-place');
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
        <Text weight="medium" style={styles.headerTitle}>Saved Places</Text>
        <TouchableOpacity onPress={() => setIsEditing((prev) => !prev)}>
          <Text weight="medium" style={styles.editText}>{isEditing ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {places.map((place) => (
          <View key={place.id} style={styles.rowWrapper}>
            <View style={styles.rowInner}>
              {isEditing && (
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(place.id)}>
                  <Text weight="bold" style={styles.removeButtonText}>−</Text>
                </TouchableOpacity>
              )}
              <Image source={place.icon} style={styles.placeIcon} contentFit="contain" />
              <Text weight="regular" style={styles.placeLabel}>{place.label}</Text>
            </View>
            <View style={styles.divider} />
          </View>
        ))}

        <TouchableOpacity style={styles.rowInner} onPress={handleAddPlace}>
          <Image
            source={require('@/assets/images/icons/add-20-regular.png')}
            style={styles.placeIcon}
            contentFit="contain"
          />
          <Text weight="regular" style={styles.addPlaceLabel}>Add a place</Text>
        </TouchableOpacity>
      </View>
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
  editText: {
    fontSize: 16,
    color: Palette.CustomBlack,
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
    gap: 16,
    paddingVertical: 20,
    width: '100%',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.Red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: Palette.White,
    fontSize: 18,
    lineHeight: 20,
  },
  placeIcon: {
    width: 24,
    height: 24,
  },
  placeLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
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
});