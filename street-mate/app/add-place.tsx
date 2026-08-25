import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';

export default function AddPlaceScreen() {
  const [query, setQuery] = useState('');

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
        <Text weight="medium" style={styles.headerTitle}>Add a Place</Text>
        <View style={styles.headerSpacer} />
      </View>

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
          placeholder="Where do you want to save?"
          placeholderTextColor={Palette.Placeholder}
          style={styles.searchInput}
        />
      </View>

      <TouchableOpacity style={styles.row}>
        <Image
          source={require('@/assets/images/icons/map-pin.png')}
          style={styles.rowIcon}
          contentFit="contain"
        />
        <Text weight="regular" style={styles.rowText}>Current Location</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.row}>
        <Image
          source={require('@/assets/images/icons/map-pinned.png')}
          style={styles.rowIcon}
          contentFit="contain"
        />
        <Text weight="regular" style={styles.rowText}>Set location on map</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.White,
    paddingHorizontal: 20,
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
    width: 30,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: Palette.Black,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
});