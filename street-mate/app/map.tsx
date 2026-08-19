import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Animated, Dimensions, PanResponder, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// Mock alternate routes — replace with real routing engine output later.
// Each route carries a tripDetails array — one entry per trip/leg — swiped through on the detail screen.
const mockAllRoutes = [
  {
    id: '1',
    duration: '35 mins',
    fare: 'GH¢ 5.00',
    stops: ['Pantang Junction', 'UPS'],
    trips: 1,
    recommended: true,
    badges: ['Fastest', 'Cheapest'],
    tripDetails: [
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Legon, Okponglo, Circle, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '35 mins',
        estFare: 'GH¢ 5.00',
        availability: 'High',
      },
    ],
  },
  {
    id: '2',
    duration: '40 mins',
    fare: 'GH¢ 9.00',
    stops: ['Pantang Junction', 'Madina', 'UPS'],
    trips: 2,
    tripDetails: [
      {
        stopName: 'Madina',
        availableTrotro: 'Madina',
        otherTrotros: 'Atomic, Accra, Circle, 37, Lapaz, Kasoa, Osu, Spintex, Okponglo',
        estTime: '30 mins',
        estFare: 'GH¢ 5.00',
        availability: 'High',
      },
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Circle, Legon, Okponglo, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '10 mins',
        estFare: 'GH¢ 4.00',
        availability: 'High',
      },
    ],
  },
  {
    id: '3',
    duration: '1 hr',
    fare: 'GH¢ 9.50',
    stops: ['Pantang Junction', 'Atomic', 'UPS'],
    trips: 2,
    tripDetails: [
      {
        stopName: 'Atomic',
        availableTrotro: 'Atomic',
        otherTrotros: 'Legon, Okponglo, Circle, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '45 mins',
        estFare: 'GH¢ 6.00',
        availability: 'Medium',
      },
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Circle, Legon, Okponglo, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '15 mins',
        estFare: 'GH¢ 3.50',
        availability: 'High',
      },
    ],
  },
];

const MAX_ROUTES_HEIGHT = Dimensions.get('window').height * 0.5;
const SWIPE_THRESHOLD = 50;

// "1 trip" vs "2 trips" — singular only when the count is exactly 1
const tripWord = (count: number) => (count === 1 ? 'trip' : 'trips');

function RouteCard({
  route,
  highlighted,
  onPress,
}: {
  route: (typeof mockAllRoutes)[number];
  highlighted?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.routeCard, highlighted && styles.routeCardHighlighted]} onPress={onPress}>
      <View style={styles.routeCardTopRow}>
        <Text weight="medium" style={styles.routeDuration}>{route.duration}</Text>
        <Text weight="medium" style={styles.routeFare}>
          GH¢<Text weight="medium" style={styles.routeFareAmount}>{route.fare.replace('GH¢', '').trim()}</Text>
        </Text>
      </View>

      <Text numberOfLines={1} style={styles.routeStops}>{route.stops.join('  →  ')}</Text>

      <View style={styles.routeBottomRow}>
        <View style={styles.routeTripsGroup}>
          <Image
            source={require('@/assets/images/icons/trip-icon.png')}
            style={styles.routeTripsIcon}
            contentFit="contain"
          />
          <Text weight="medium" style={styles.routeTripsText}>{route.trips} {tripWord(route.trips)}</Text>
        </View>

        {route.badges && route.badges.length > 0 && (
          <View style={styles.routeBadgesGroup}>
            {route.badges.map((badge, index) => (
              <View key={badge} style={styles.routeBadgeItem}>
                <Image
                  source={
                    badge === 'Fastest'
                      ? require('@/assets/images/icons/fastest.png')
                      : require('@/assets/images/icons/cheapest.png')
                  }
                  style={styles.routeBadgeIcon}
                  contentFit="contain"
                />
                <Text weight="medium" style={styles.routeBadgeText}>{badge}</Text>
                {index < route.badges.length - 1 && <Text style={styles.routeBadgeDot}> · </Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const { origin, destination } = useLocalSearchParams<{ origin?: string; destination?: string }>();
  const [activeTab, setActiveTab] = useState<'best' | 'all'>('best');
  const [otherRoutesExpanded, setOtherRoutesExpanded] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [currentTripIndex, setCurrentTripIndex] = useState(0);
  const expandAnim = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed
  const tripSlide = useRef(new Animated.Value(0)).current;
  const tripOpacity = useRef(new Animated.Value(1)).current;

  const selectedRoute = mockAllRoutes.find((r) => r.id === selectedRouteId) ?? null;
  const recommendedRoute = mockAllRoutes.find((r) => r.recommended);
  const otherRoutes = mockAllRoutes.filter((r) => !r.recommended);

  // Whichever route is currently in detail view — the tapped card, or the recommended one on Best Route
  const activeDetailRoute = selectedRoute ?? (activeTab === 'best' ? recommendedRoute : null);
  const activeTrip = activeDetailRoute?.tripDetails[currentTripIndex] ?? null;

  const animateTo = (expanded: boolean) => {
    setOtherRoutesExpanded(expanded);
    Animated.spring(expandAnim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false, // animating height/maxHeight requires the JS driver
      friction: 8,
      tension: 60,
    }).start();
  };

  const goToTab = (tab: 'best' | 'all') => {
    setSelectedRouteId(null);
    setCurrentTripIndex(0);
    setActiveTab(tab);
  };

  const selectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setCurrentTripIndex(0);
  };

  const goToTripIndex = (nextIndex: number, direction: 'left' | 'right') => {
    // Slide the current trip out, swap the index, slide the new trip in from the opposite side
    Animated.parallel([
      Animated.timing(tripSlide, {
        toValue: direction === 'left' ? -40 : 40,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tripOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentTripIndex(nextIndex);
      tripSlide.setValue(direction === 'left' ? 40 : -40);
      Animated.parallel([
        Animated.spring(tripSlide, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }),
        Animated.timing(tripOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleTripSwipeEnd = (dx: number) => {
    if (!activeDetailRoute) return;
    const lastIndex = activeDetailRoute.tripDetails.length - 1;

    if (dx < -SWIPE_THRESHOLD && currentTripIndex < lastIndex) {
      goToTripIndex(currentTripIndex + 1, 'left');
    } else if (dx > SWIPE_THRESHOLD && currentTripIndex > 0) {
      goToTripIndex(currentTripIndex - 1, 'right');
    }
  };

  const tripSwipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      runOnJS(handleTripSwipeEnd)(event.translationX);
    });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 15) {
          // Dragged down — collapse to show only Recommended
          animateTo(false);
        } else if (gestureState.dy < -15) {
          // Dragged up — expand to show Other Routes too
          animateTo(true);
        }
      },
    })
  ).current;

  useEffect(() => {
    // Reset to expanded whenever leaving the All Routes tab, so it's fresh next time
    if (activeTab !== 'all' && !otherRoutesExpanded) {
      animateTo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
        <View
          style={styles.dragHandle}
          {...panResponder.panHandlers}
          hitSlop={{ top: 15, bottom: 15, left: 40, right: 40 }}
        />

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'best' && !selectedRoute && styles.tabActive]}
            onPress={() => goToTab('best')}>
            <Text
              weight={activeTab === 'best' && !selectedRoute ? 'semibold' : 'medium'}
              style={[styles.tabText, activeTab === 'best' && !selectedRoute && styles.tabTextActive]}>
              BEST ROUTE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && !selectedRoute && styles.tabActive]}
            onPress={() => goToTab('all')}>
            <Text
              weight={activeTab === 'all' && !selectedRoute ? 'semibold' : 'medium'}
              style={[styles.tabText, activeTab === 'all' && !selectedRoute && styles.tabTextActive]}>
              ALL ROUTES
            </Text>
          </TouchableOpacity>

          {activeDetailRoute ? (
            <Text style={styles.tripCount}>
              <Text weight="semibold" style={styles.tripCountActive}>{currentTripIndex + 1}</Text>
              <Text weight="medium" style={styles.tripCount}>
                {' '}of {activeDetailRoute.trips} {tripWord(activeDetailRoute.trips)}
              </Text>
            </Text>
          ) : (
            <Text weight="medium" style={styles.tripCount}>{mockAllRoutes.length} routes found</Text>
          )}
        </View>

        {activeDetailRoute && activeTrip ? (
          <>
            <GestureDetector gesture={tripSwipeGesture}>
              <Animated.View style={{ transform: [{ translateX: tripSlide }], opacity: tripOpacity }}>
                <View style={styles.stopCard}>
                  <View style={styles.stopCardRow}>
                    <View>
                      <Text weight="medium" style={styles.stopCardLabel}>Stop Name</Text>
                      <Text weight="medium" style={styles.stopCardValue}>{activeTrip.stopName}</Text>
                    </View>
                    <View style={styles.stopCardRight}>
                      <Text weight="medium" style={styles.stopCardLabel}>Available Trotro</Text>
                      <Text weight="medium" style={styles.stopCardValue}>{activeTrip.availableTrotro}</Text>
                    </View>
                  </View>

                  <View style={styles.stopCardBottomRow}>
                    <View style={styles.otherTrotrosGroup}>
                      <Text weight="medium" style={styles.stopCardLabel}>Other Trotros on Route</Text>
                      <Text numberOfLines={2} style={styles.otherTrotrosText}>{activeTrip.otherTrotros}</Text>
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
                      <Text weight="medium" style={styles.statValue}>{activeTrip.estTime}</Text>
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
                      <Text weight="medium" style={styles.statValue}>{activeTrip.estFare}</Text>
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
                        <Text weight="medium" style={styles.statValue}>{activeTrip.availability}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>

            <TouchableOpacity style={styles.startButton}>
              <Text weight="medium" style={styles.startButtonText}>Start Journey</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: MAX_ROUTES_HEIGHT }}>
            {recommendedRoute && (
              <View style={styles.routeSection}>
                <Text weight="semibold" style={styles.routeSectionTitle}>Recommended</Text>
                <RouteCard route={recommendedRoute} highlighted onPress={() => selectRoute(recommendedRoute.id)} />
              </View>
            )}

            {otherRoutes.length > 0 && (
              <Animated.View
                style={[
                  styles.routeSectionLast,
                  {
                    opacity: expandAnim,
                    maxHeight: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 600],
                    }),
                    overflow: 'hidden',
                  },
                ]}>
                <View style={styles.routeSection}>
                  <Text weight="semibold" style={styles.routeSectionTitle}>Other Routes</Text>
                  {otherRoutes.map((route) => (
                    <RouteCard key={route.id} route={route} onPress={() => selectRoute(route.id)} />
                  ))}
                </View>
              </Animated.View>
            )}
          </ScrollView>
        )}
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
  routeSection: {
    marginBottom: 20,
  },
  routeSectionTitle: {
    paddingBottom: 10,
    fontSize: 16,
  },
  routeSectionLast: {
    marginBottom: 0,
  },
  routeCard: {
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  routeCardHighlighted: {
    borderColor: Palette.CustomBlack,
  },
  routeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  routeDuration: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  routeFare: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  routeFareAmount: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  routeStops: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  routeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeTripsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeTripsIcon: {
    width: 16,
    height: 16,
  },
  routeTripsText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  routeBadgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeBadgeIcon: {
    width: 16,
    height: 16,
  },
  routeBadgeText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  routeBadgeDot: {
    fontSize: 16,
    color: Palette.DarkGray,
  },
});