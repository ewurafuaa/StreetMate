import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';

// Mock route result — replace with real routing engine output later.
const mockRoute = {
  stopName: 'UPS',
  availableTrotro: 'Accra',
  otherTrotros: 'Legon, Okponglo, Circle, 37, Lapaz, Kasoa, Osu, Spintex',
  estTime: '35 mins',
  estFare: 'GH¢ 5.00',
  availability: 'High',
  activeTripNumber: 1,
  totalTrips: 1,
};

export default function MapScreen() {
  const { origin, destination } = useLocalSearchParams<{ origin?: string; destination?: string }>();
  const [activeTab, setActiveTab] = useState<'best' | 'all'>('best');

  return (
    <View style={styles.container}>
      {/* Placeholder map background — swap for react-native-maps once wired up */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.routeLine} />
        <View style={[styles.busMarker, styles.busMarkerStart]}>
          <Image
            source={require('@/assets/images/icons/bus-stop.png')}
            style={styles.busMarkerIcon}
            contentFit="contain"
          />
        </View>
        <View style={[styles.busMarker, styles.busMarkerEnd]}>
          <Image
            source={require('@/assets/images/icons/bus-stop.png')}
            style={styles.busMarkerIcon}
            contentFit="contain"
          />
        </View>
        <View style={styles.destinationDot} />
      </View>

      <SafeAreaView style={styles.topBarSafeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={require('@/assets/images/icons/chevron-left.png')}
              style={styles.backIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <Text weight="medium" style={styles.topBarRoute} numberOfLines={1}>
            <Text weight="medium" style={styles.topBarOrigin}>{origin ?? 'Current location'}</Text>
            {'  →  '}
            <Text weight="medium" style={styles.topBarDestination}>{destination ?? 'Destination'}</Text>
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'best' && styles.tabActive]}
            onPress={() => setActiveTab('best')}>
            <Text
              weight={activeTab === 'best' ? 'semibold' : 'medium'}
              style={[styles.tabText, activeTab === 'best' && styles.tabTextActive]}>
              BEST ROUTE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}>
            <Text
              weight={activeTab === 'all' ? 'semibold' : 'medium'}
              style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              ALL ROUTES
            </Text>
          </TouchableOpacity>
          <Text style={styles.tripCount}>
            <Text weight="semibold" style={styles.tripCountActive}>{mockRoute.activeTripNumber}</Text>
            <Text weight="medium" style={styles.tripCount}> of {mockRoute.totalTrips} trip</Text>
          </Text>
        </View>

        <View style={styles.stopCard}>
          <View style={styles.stopCardRow}>
            <View>
              <Text weight="medium" style={styles.stopCardLabel}>Stop Name</Text>
              <Text weight="medium" style={styles.stopCardValue}>{mockRoute.stopName}</Text>
            </View>
            <View style={styles.stopCardRight}>
              <Text weight="medium" style={styles.stopCardLabel}>Available Trotro</Text>
              <Text weight="medium" style={styles.stopCardValue}>{mockRoute.availableTrotro}</Text>
            </View>
          </View>

          <View style={styles.stopCardBottomRow}>
            <View style={styles.otherTrotrosGroup}>
              <Text weight="medium" style={styles.stopCardLabel}>Other Trotros on Route</Text>
              <Text style={styles.otherTrotrosText}>{mockRoute.otherTrotros}</Text>
            </View>
            <TouchableOpacity style={styles.stopCardArrowButton}>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.stopCardArrowIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Image
              source={require('@/assets/images/icons/estimated-time.png')}
              style={styles.statIcon}
              contentFit="contain"
            />
            <View>
              <Text weight="medium" style={styles.statLabel}>Est. Time</Text>
              <Text weight="medium" style={styles.statValue}>{mockRoute.estTime}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Image
              source={require('@/assets/images/icons/estimated-fare.png')}
              style={styles.statIcon}
              contentFit="contain"
            />
            <View>
              <Text weight="medium" style={styles.statLabel}>Est. Fare</Text>
              <Text weight="medium" style={styles.statValue}>{mockRoute.estFare}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Image
              source={require('@/assets/images/icons/availability-status.png')}
              style={styles.statIcon}
              contentFit="contain"
            />
            <View>
              <Text weight="medium" style={styles.statLabel}>Availability</Text>
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityDot} />
                <Text weight="medium" style={styles.statValue}>{mockRoute.availability}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.startButton}>
          <Text weight="medium" style={styles.startButtonText}>Start Journey</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.GrayBackground,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Palette.GrayBackground,
  },
  routeLine: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '55%',
    height: 2,
    backgroundColor: Palette.CustomBlack,
    transform: [{ rotate: '18deg' }],
  },
  busMarker: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.LightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busMarkerStart: {
    top: '24%',
    left: '18%',
  },
  busMarkerEnd: {
    top: '48%',
    left: '42%',
  },
  busMarkerIcon: {
    width: 18,
    height: 18,
  },
  destinationDot: {
    position: 'absolute',
    top: '27%',
    left: '32%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Palette.CustomBlack,
  },
  topBarSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.White,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
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
  topBarRoute: {
    flex: 1,
    fontSize: 14,
    color: Palette.CustomBlack,
    textAlign: 'right',
    marginRight: 10,
  },
  topBarOrigin: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  topBarDestination: {
    fontSize: 14,
    color: Palette.CustomBlack,
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
    paddingBottom: 30,
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    borderColor: Palette.LightGray,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tabActive: {
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
  },
  tabText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  tabTextActive: {
    color: Palette.CustomBlack,
  },
  tripCount: {
    marginLeft: 'auto',
    fontSize: 13,
    color: Palette.DarkGray,
  },
  tripCountActive: {
    fontSize: 13,
    color: Palette.CustomBlack,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  stopCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stopCardRight: {
    alignItems: 'flex-end',
  },
  stopCardLabel: {
    fontSize: 14,
    color: Palette.DarkGray,
    marginBottom: 0,
  },
  stopCardValue: {
    fontSize: 32,
    color: Palette.CustomBlack,
  },
  stopCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  otherTrotrosGroup: {
    flex: 1,
    marginRight: 12,
  },
  otherTrotrosText: {
    fontSize: 16,
    color: Palette.CustomBlack,
    lineHeight: 18,
  },
  stopCardArrowButton: {
    width: 30,
    height: 30,
  },
  stopCardArrowIcon: {
    width: 30,
    height: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statIcon: {
    width: 20,
    height: 20,
  },
  statLabel: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  statValue: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.Green,
  },
  startButton: {
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  startButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
});