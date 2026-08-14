import { useState } from 'react';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ImageBackground } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { Sidebar } from '@/components/sidebar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';

// Sample data — replace with real trip history later.
// Leave this as an empty array ([]) to see the "new user" version.
const recentTrips = [
  {
    id: '1',
    route: ['Pantang Junction', 'UPS'],
    duration: '35 mins',
    price: 'GH¢ 5.00',
  },
  {
    id: '2',
    route: ['Legon 1st', 'Las Palmas', 'Bafana'],
    duration: '1 hr 15 mins',
    price: 'GH¢ 11.00',
  },
];

const popularDestinations = ['Madina', 'Circle', 'Atomic Junction', 'Achimota'];

export default function HomeScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => setSidebarOpen(true)}>
              <Image
                source={require('@/assets/images/icons/menu.png')}
                style={styles.headerIcon}
                contentFit="contain"
              />
            </TouchableOpacity>

            <Image
              source={require('@/assets/images/streetmate-logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <TouchableOpacity>
            <Image
              source={require('@/assets/images/icons/alert-20-regular.png')}
              style={styles.headerIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <ImageBackground
          source={require('@/assets/images/hero-card.png')}
          style={styles.heroCard}
          imageStyle={styles.heroCardImage}>
          <Text style={styles.heroHeading}>IT&apos;S A GOOD DAY TO EXPLORE NEW PLACES.</Text>
          <Text weight="medium" style={styles.heroSubheading}>Find the right bus, find the right place.</Text>

          <View style={styles.searchBar}>
            <Image
              source={require('@/assets/images/icons/search.png')}
              style={styles.searchIcon}
              contentFit="contain"
            />
            <TextInput
              placeholder="Where are you off to today?"
              placeholderTextColor={Palette.Placeholder}
              style={styles.searchInput}
            />
            <TouchableOpacity>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.arrowIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Recent Trips — hidden entirely when there are none */}
        {recentTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text weight="bold" style={styles.sectionTitle}>Recent Trips</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentTrips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard}>
                <View style={styles.tripCardTop}>
                  <Text style={styles.tripRoute} numberOfLines={1}>
                    {trip.route.join('  →  ')}
                  </Text>
                  <Image
                    source={require('@/assets/images/icons/arrow-circle-right.png')}
                    style={styles.arrowIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.tripMeta}>
                  {trip.duration} · {trip.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Destinations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={{ gap: 10 }}>
            {popularDestinations.map((place) => (
              <TouchableOpacity key={place} style={styles.chip}>
                <Text style={styles.chipText}>{place}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Info cards */}
        <View style={styles.infoCardRow}>
          <TouchableOpacity style={[styles.infoCard, styles.infoCardDark]}>
            <View style={styles.infoIconWrap}>
              <Image
                source={require('@/assets/images/icons/lightbulb-circle-20-regular.png')}
                style={styles.infoIcon}
                contentFit="contain"
              />
            </View>
            <Text style={styles.infoCardTitle}>Trotro Tips</Text>
            <Text style={styles.infoCardDescDark}>
              New to the trotro life? Learn a few tips to make your travel experience a better
              and seamless one.
            </Text>
            <Image
              source={require('@/assets/images/icons/arrow-circle-right.png')}
              style={styles.infoArrowIcon}
              contentFit="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.infoCard, styles.infoCardLight]}>
            <View style={styles.infoIconWrap}>
              <Image
                source={require('@/assets/images/icons/map-20-regular.png')}
                style={styles.infoIcon}
                contentFit="contain"
              />
            </View>
            <Text style={styles.infoCardTitle}>Route Hub</Text>
            <Text style={styles.infoCardDescLight}>
              Know a route we missed or one you&apos;d like to see? Let us know and help make
              StreetMate better for everyone.
            </Text>
            <Image
              source={require('@/assets/images/icons/arrow-circle-right.png')}
              style={styles.infoArrowIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} activeKey="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.White,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  logo: {
    width: 156,
    height: 32,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    overflow: 'hidden',
  },
  heroCardImage: {
    borderRadius: 24,
  },
  heroHeading: {
    color: Palette.White,
    fontSize: 24,
    fontFamily: 'Antonio_500Medium',
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  heroSubheading: {
    color: Palette.Placeholder,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 70,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.White,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.CustomBlack,
    fontFamily: 'HelveticaNowDisplay-Medium',
  },
  arrowIcon: {
    width: 30,
    height: 30,
  },
  section: {
    marginTop: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  viewAll: {
    fontSize: 12,
    color: Palette.DarkGray,

  },
  tripCard: {
    borderWidth: 1,
    borderColor: Palette.Placeholder,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  tripCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.CustomBlack,
    flex: 1,
    marginRight: 12,
  },
  tripMeta: {
    fontSize: 13,
    color: Palette.DarkGray,
    marginTop: 8,
  },
  chipsRow: {
    flexGrow: 0,
  },
  chip: {
    borderWidth: 1,
    borderColor: Palette.Placeholder,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  infoCardRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
  },
  infoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 210,
  },
  infoCardDark: {
    backgroundColor: Palette.LightGray,
  },
  infoCardLight: {
    backgroundColor: Palette.GrayBackground,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.White,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  infoIcon: {
    width: 20,
    height: 20,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.CustomBlack,
    marginBottom: 6,
  },
  infoCardDescDark: {
    fontSize: 12.5,
    color: '#3A3A3A',
    lineHeight: 18,
    flex: 1,
  },
  infoCardDescLight: {
    fontSize: 12.5,
    color: '#8A8A8A',
    lineHeight: 18,
    flex: 1,
  },
  infoArrowIcon: {
    width: 32,
    height: 32,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
});