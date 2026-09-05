import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { Sidebar } from '@/components/sidebar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';

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
const heroMessages = ["LET'S HIT THE STREETS!", 'YEN KC!'];

export default function HomeScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -30, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setMessageIndex((prev) => (prev + 1) % heroMessages.length);
        slideAnim.setValue(30);

        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — stays static */}
      <View style={styles.staticHeader}>
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
      </View>

      {/* Everything below the header — scrollable, hero card included */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Image source={require('@/assets/images/hero-card.png')} style={styles.heroCardImage} contentFit="cover" priority="high" cachePolicy="memory-disk" transition={150}/>
          <Animated.Text
            style={[
              styles.heroHeading,
              styles.heroHeadingFont,
              { transform: [{ translateX: slideAnim }], opacity: fadeAnim },
            ]}>
            {heroMessages[messageIndex]}
          </Animated.Text>
          <Text weight="medium" style={styles.heroSubheading}>Find the right bus, find the right place.</Text>

          <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/search')}>
            <Image
              source={require('@/assets/images/icons/search.png')}
              style={styles.searchIcon}
              contentFit="contain"
            />
            <Text style={styles.searchInputPlaceholder}>Where to?</Text>
            <Image
              source={require('@/assets/images/icons/arrow-circle-right.png')}
              style={styles.arrowIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Recent Trips — hidden entirely when there are none */}
        {recentTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text weight="medium" style={styles.sectionTitle}>Recent Trips</Text>
              <TouchableOpacity>
                <Text weight="medium" style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentTrips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard}>
                <View style={styles.tripCardTextGroup}>
                  <Text style={styles.tripRoute} numberOfLines={1}>
                    {trip.route.join('  →  ')}
                  </Text>
                  <Text weight="medium" style={styles.tripMeta}>
                    {trip.duration} · {trip.price}
                  </Text>
                </View>
                <Image
                  source={require('@/assets/images/icons/arrow-circle-right.png')}
                  style={styles.arrowIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Destinations */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
              <Text weight="medium" style={styles.sectionTitle}>Popular Destinations</Text>
              <TouchableOpacity>
                <Text weight="medium" style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.destinationList}>
            {popularDestinations.map((place) => (
              <TouchableOpacity key={place} style={styles.destinationCard}>
                <Image
                  source={require('@/assets/images/map-thumbnail.png')}
                  style={styles.destinationImage}
                  contentFit="cover"
                />
                <View style={styles.destinationTextGroup}>
                  <Text weight="regular" style={styles.destinationName}>{place}</Text>
                  <Text style={styles.destinationSubtitle}>View route</Text>
                </View>
                <Image
                  source={require('@/assets/images/icons/arrow-circle-right.png')}
                  style={styles.destinationArrow}
                  contentFit="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Info cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.infoCardRow}>
          <TouchableOpacity style={styles.infoCard}>
            <Image
              source={require('@/assets/images/trotro-tips.png')}
              style={styles.infoCardImage}
              contentFit="cover"
            />
            <Text weight="semibold" style={styles.infoCardTitle}>Trotro Tips</Text>
            <View style={styles.infoCardBottomRow}>
              <Text weight="regular" style={styles.infoCardDesc}>
                New to the trotro life? Learn a few tips to make your travel experience a better
                and seamless one.
              </Text>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.infoArrowIcon}
                contentFit="contain"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoCard}>
            <Image
              source={require('@/assets/images/route-hub.png')}
              style={styles.infoCardImage}
              contentFit="cover"
            />
            <Text weight="bold" style={styles.infoCardTitle}>Route Hub</Text>
            <View style={styles.infoCardBottomRow}>
              <Text style={styles.infoCardDesc}>
                Know a route we missed? Have a request? Share your thoughts and help improve
                StreetMate.
              </Text>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.infoArrowIcon}
                contentFit="contain"
              />
            </View>
          </TouchableOpacity>
        </ScrollView>
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
  staticHeader: {
    paddingHorizontal: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
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
    width: 30,
    height: 30,
  },
  logo: {
    width: 156,
    height: 32,
  },
  heroCard: {
  borderRadius: 20,
  padding: 20,
  marginTop: 10,
  marginBottom: 10,
  overflow: 'hidden',
  position: 'relative',
  },
  heroCardImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  heroHeading: {
    color: Palette.White,
    fontSize: 24,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  heroHeadingFont: {
    fontFamily: 'Poppins_700Bold',
  },
  heroSubheading: {
    color: Palette.Placeholder,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 100,
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
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: Palette.Placeholder,
    fontFamily: 'Poppins_400Regular',
  },
  arrowIcon: {
    width: 30,
    height: 30,
  },
  section: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  viewAll: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  tripCardTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.CustomBlack,
    flex: 1,
    marginRight: 10,
  },
  tripMeta: {
    fontSize: 14,
    color: Palette.DarkGray,
    marginTop: 5,
  },
  horizontalScroll: {
    overflow: 'visible',
  },
  destinationList: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  destinationImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  destinationTextGroup: {
    flexShrink: 1,
  },
  destinationName: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  destinationSubtitle: {
    fontSize: 14,
    color: Palette.DarkGray,
    marginTop: 0,
  },
  destinationArrow: {
    width: 30,
    height: 30,
  },
  infoCardRow: {
    gap: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  infoCard: {
    width: 350,
    backgroundColor: Palette.White,
    borderRadius: 20,
    padding: 20,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  infoCardImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  infoCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 4,
  },
  infoCardDesc: {
    flex: 1,
    fontSize: 14,
    color: Palette.DarkGray,
    lineHeight: 14,
  },
  infoArrowIcon: {
    width: 30,
    height: 30,
  },
});