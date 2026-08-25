//journey.tsx
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';

// Fallback journey steps — used only if no real route data is available (e.g. no routeId passed).
const mockJourneySteps = [
  {
    type: 'walk',
    title: 'Walk to Pantang Junction',
    description: 'Follow the path to get to your bus stop',
    etaMins: 30,
    stopsAway: 8,
    icon: require('@/assets/images/icons/walk-outline.png'),
    arrow: require('@/assets/images/icons/walk-arrow.png'),
  },
  {
    type: 'board',
    title: 'Board an Accra car',
    description: 'Wait at the roadside for a mate mentioning a car heading in the direction of your destination',
    etaMins: 30,
    stopsAway: 8,
    icon: require('@/assets/images/icons/bus.png'),
    arrow: require('@/assets/images/icons/ride-arrow.png'),
  },
];

// Fallback stop list — used only if no real route data is available.
const mockStops = [
  'Pantang Junction',
  'Taxi Rank',
  'Adenta Barrier',
  'WASS',
  'Kenkey House',
  'Ritz Junction',
  'Red Co.',
  'Madina',
];

// Fallback next-trip card — used only when the route has no further legs to pull real data from.
const mockNextTrip = {
  duration: '10 mins',
  fare: 'GH¢ 4.00',
  from: 'Madina',
  to: 'UPS',
};

// Mock ride-hailing options — replace with real connector/deep-link data later.
const rideOptions = [
  { key: 'uber', name: 'Uber', icon: require('@/assets/images/icons/uber-logo.jpg') },
  { key: 'yango', name: 'Yango', icon: require('@/assets/images/icons/yango-logo.jpg') },
  { key: 'bolt', name: 'Bolt', icon: require('@/assets/images/icons/bolt-logo.png') },
];

// Same route data as map.tsx — replace both with a shared data source once wired to a real backend.
const mockAllRoutes = [
  {
    id: '1',
    duration: '35 mins',
    fare: 'GH¢ 5.00',
    stops: ['Pantang Junction', 'UPS'],
    trips: 1,
    tripDetails: [
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Legon, Okponglo, Circle, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '35 mins',
        estFare: 'GH¢ 5.00',
        availability: 'High',
        stopsCount: 4,
        intermediateStops: ['Taxi Rank', 'Adenta Barrier', 'WASS', 'Kenkey House'],
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
        stopsCount: 6,
        intermediateStops: ['Taxi Rank', 'Adenta Barrier', 'WASS', 'Kenkey House', 'Ritz Junction', 'Red Co.'],
      },
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Circle, Legon, Okponglo, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '10 mins',
        estFare: 'GH¢ 4.00',
        availability: 'High',
        stopsCount: 1,
        intermediateStops: ['Atomic Junction'],
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
        stopsCount: 8,
        intermediateStops: [
          'Taxi Rank',
          'Adenta Barrier',
          'WASS',
          'Kenkey House',
          'Ritz Junction',
          'Red Co.',
          'Shiashie',
          '37 Station',
        ],
      },
      {
        stopName: 'UPS',
        availableTrotro: 'Accra',
        otherTrotros: 'Circle, Legon, Okponglo, 37, Lapaz, Kasoa, Osu, Spintex',
        estTime: '15 mins',
        estFare: 'GH¢ 3.50',
        availability: 'High',
        stopsCount: 2,
        intermediateStops: ['Airport Junction', 'Ridge'],
      },
    ],
  },
];

const STEP_ADVANCE_INTERVAL = 6000; // demo-only: auto-advances every 6s
const SCREEN_HEIGHT = Dimensions.get('window').height;

const stopWord = (count: number) => (count === 1 ? 'stop' : 'stops');

// Pulls the leading number out of strings like "30 mins" or "1 hr" for use as a mock ETA.
const parseEtaMinutes = (estTime: string): number => {
  const match = estTime.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// High beats Medium beats Low — used to summarize overall availability across all legs
const availabilityRank: Record<string, number> = { High: 2, Medium: 1, Low: 0 };
const worstAvailability = (values: string[]) =>
  values.reduce((worst, current) => (availabilityRank[current] < availabilityRank[worst] ? current : worst), values[0]);

export default function JourneyScreen() {
  const { origin, destination, tripIndex, totalTrips, routeId } = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    tripIndex?: string;
    totalTrips?: string;
    routeId?: string;
  }>();
  const [stepIndex, setStepIndex] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContentHeight = useRef(0);
  const scrollLayoutHeight = useRef(0);

  const [showRideOptions, setShowRideOptions] = useState(false);
  const rideSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const rideSheetOverlayOpacity = useRef(new Animated.Value(0)).current;

  const [showTripOverview, setShowTripOverview] = useState(false);
  const [expandedLegKey, setExpandedLegKey] = useState<string | null>(null);
  const [isArrivalPreview, setIsArrivalPreview] = useState(false);
  const overviewSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Trotro list sheet — same as map.tsx's version
  const [showTrotroSheet, setShowTrotroSheet] = useState(false);
  const [trotroSheetData, setTrotroSheetData] = useState<{ availableTrotro: string; otherTrotros: string[] } | null>(
    null
  );
  const trotroSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const trotroSheetOverlayOpacity = useRef(new Animated.Value(0)).current;
  const [trotroCanScrollUp, setTrotroCanScrollUp] = useState(false);
  const [trotroCanScrollDown, setTrotroCanScrollDown] = useState(false);
  const trotroScrollContentHeight = useRef(0);
  const trotroScrollLayoutHeight = useRef(0);

  const totalTripsNum = Number(totalTrips ?? 1);
  const [activeTripIndex, setActiveTripIndex] = useState(Number(tripIndex ?? 0));
  const hasNextTrip = activeTripIndex < totalTripsNum - 1;

  // The full route this journey belongs to — used to build per-leg walking/boarding data + the full Trip Overview
  const activeDetailRoute = mockAllRoutes.find((r) => r.id === routeId) ?? null;

  // The specific leg currently being traveled — drives the instruction card, ETA, and stop list below
  const currentLegData = activeDetailRoute?.tripDetails[activeTripIndex] ?? null;
  const legFromStop = activeDetailRoute
    ? activeTripIndex === 0
      ? activeDetailRoute.stops[0]
      : activeDetailRoute.tripDetails[activeTripIndex - 1].stopName
    : mockStops[0];

  const legStops = currentLegData
    ? [legFromStop, ...(currentLegData.intermediateStops ?? []), currentLegData.stopName]
    : mockStops;

  const journeySteps = currentLegData
    ? [
        {
          type: 'walk',
          title: `Walk to ${legFromStop}`,
          description: 'Follow the path to get to your bus stop',
          etaMins: parseEtaMinutes(currentLegData.estTime),
          stopsAway: legStops.length - 1,
          icon: require('@/assets/images/icons/walk-outline.png'),
          arrow: require('@/assets/images/icons/walk-arrow.png'),
        },
        {
          type: 'board',
          title: `Board a ${currentLegData.availableTrotro} car`,
          description:
            'Wait at the roadside for a mate mentioning a car heading in the direction of your destination',
          etaMins: parseEtaMinutes(currentLegData.estTime),
          stopsAway: legStops.length - 1,
          icon: require('@/assets/images/icons/bus.png'),
          arrow: require('@/assets/images/icons/ride-arrow.png'),
        },
      ]
    : mockJourneySteps;

  const currentStep = journeySteps[Math.min(stepIndex, journeySteps.length - 1)];
  const lastStopName = legStops[legStops.length - 1];
  const isLastStop = visitedCount === legStops.length - 1;

  // The upcoming leg (if any) — powers the "Recommended / Start Next Trip" card on arrival
  const nextLegData = activeDetailRoute?.tripDetails[activeTripIndex + 1] ?? null;
  const nextTripDisplay =
    nextLegData && currentLegData
      ? {
          duration: nextLegData.estTime,
          fare: nextLegData.estFare,
          from: currentLegData.stopName,
          to: nextLegData.stopName,
        }
      : mockNextTrip;

  const overviewLegs = activeDetailRoute
    ? activeDetailRoute.tripDetails.map((trip, index) => ({
        from: index === 0 ? activeDetailRoute.stops[0] : activeDetailRoute.tripDetails[index - 1].stopName,
        to: trip.stopName,
        stopsCount: trip.stopsCount,
        intermediateStops: trip.intermediateStops ?? [],
        estTime: trip.estTime,
        estFare: trip.estFare,
        availability: trip.availability,
        availableTrotro: trip.availableTrotro,
        otherTrotros: trip.otherTrotros,
      }))
    : [];

  const overallAvailability = activeDetailRoute
    ? worstAvailability(activeDetailRoute.tripDetails.map((t) => t.availability))
    : 'High';

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = Math.min(prev + 1, journeySteps.length - 1);
        if (next !== prev) {
          Animated.sequence([
            Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
        return next;
      });
      setVisitedCount((prev) => Math.min(prev + 1, legStops.length - 1));
    }, STEP_ADVANCE_INTERVAL);

    return () => clearInterval(interval);
    // Restart the timer whenever the active leg changes, so it plays out that leg's own step count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTripIndex, journeySteps.length, legStops.length]);

  // Once the mock progress reaches the final stop, show the arrival sheet.
  useEffect(() => {
    if (isLastStop) {
      const timer = setTimeout(() => setHasArrived(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLastStop]);

  const evaluateScrollFades = (offsetY: number) => {
    const maxScroll = scrollContentHeight.current - scrollLayoutHeight.current;
    setCanScrollUp(offsetY > 4);
    setCanScrollDown(offsetY < maxScroll - 4);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    evaluateScrollFades(e.nativeEvent.contentOffset.y);
  };

  const handleScrollLayout = (e: LayoutChangeEvent) => {
    scrollLayoutHeight.current = e.nativeEvent.layout.height;
    evaluateScrollFades(0);
  };

  const handleScrollContentSizeChange = (_width: number, height: number) => {
    scrollContentHeight.current = height;
    evaluateScrollFades(0);
  };

  const handleEndJourney = () => {
    router.replace('/');
  };

  const handleStartNextTrip = () => {
    setActiveTripIndex((prev) => Math.min(prev + 1, totalTripsNum - 1));
    setHasArrived(false);
    setStepIndex(0);
    setVisitedCount(0);
  };

  const openRideOptions = () => {
    setShowRideOptions(true);
    Animated.parallel([
      Animated.timing(rideSheetOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(rideSheetSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }),
    ]).start();
  };

  const closeRideOptions = () => {
    Animated.parallel([
      Animated.timing(rideSheetOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rideSheetSlide, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowRideOptions(false));
  };

  const openTripOverview = (arrivalPreview = false) => {
    setExpandedLegKey(null);
    setIsArrivalPreview(arrivalPreview);
    setShowTripOverview(true);
    Animated.spring(overviewSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }).start();
  };

  const closeTripOverview = () => {
    Animated.timing(overviewSlide, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() =>
      setShowTripOverview(false)
    );
  };

  const openTrotroSheet = (availableTrotro: string, otherTrotros: string) => {
    setTrotroSheetData({
      availableTrotro,
      otherTrotros: otherTrotros.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setShowTrotroSheet(true);
    Animated.parallel([
      Animated.timing(trotroSheetOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(trotroSheetSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }),
    ]).start();
  };

  const closeTrotroSheet = () => {
    Animated.parallel([
      Animated.timing(trotroSheetOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(trotroSheetSlide, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowTrotroSheet(false));
  };

  const evaluateTrotroScrollFades = (offsetY: number) => {
    const maxScroll = trotroScrollContentHeight.current - trotroScrollLayoutHeight.current;
    setTrotroCanScrollUp(offsetY > 4);
    setTrotroCanScrollDown(offsetY < maxScroll - 4);
  };

  const handleTrotroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    evaluateTrotroScrollFades(e.nativeEvent.contentOffset.y);
  };

  const handleTrotroScrollLayout = (e: LayoutChangeEvent) => {
    trotroScrollLayoutHeight.current = e.nativeEvent.layout.height;
    evaluateTrotroScrollFades(0);
  };

  const handleTrotroScrollContentSizeChange = (_width: number, height: number) => {
    trotroScrollContentHeight.current = height;
    evaluateTrotroScrollFades(0);
  };

  return (
    <View style={styles.container}>
      {/* Placeholder map background — swap for react-native-maps + live tracking later */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.routeLine} />
        <View style={styles.currentLocationMarker}>
          <Image
            source={require('@/assets/images/icons/bus-stop.png')}
            style={styles.currentLocationIcon}
            contentFit="contain"
          />
        </View>
        {!hasArrived && (
          <View style={styles.headingArrow}>
            <View style={styles.headingArrowInner} />
          </View>
        )}
      </View>

      <SafeAreaView style={styles.topCardSafeArea} edges={['top']}>
        {hasArrived ? (
          <View style={styles.topBarPill}>
            <TouchableOpacity onPress={() => router.back()}>
              <Image
                source={require('@/assets/images/icons/chevron-left.png')}
                style={styles.backIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
            <Text weight="medium" style={styles.topBarRouteText} numberOfLines={1}>
              {origin ?? 'Current location'}  →  {destination ?? 'Destination'}
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.instructionCard, { opacity: cardOpacity }]}>
            <View style={styles.instructionTextGroup}>
              <View style={styles.instructionTitleRow}>
                <Image source={currentStep.icon} style={styles.instructionIcon} contentFit="contain" />
                <Text weight="medium" style={styles.instructionTitle}>{currentStep.title}</Text>
              </View>
              <Text style={styles.instructionDescription}>{currentStep.description}</Text>
            </View>
            <Image source={currentStep.arrow} style={styles.instructionArrow} contentFit="contain" />
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Bottom sheet */}
      <View style={[styles.bottomSheet, hasArrived && styles.bottomSheetArrived]}>
        <View style={styles.dragHandle} />

        {hasArrived ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.arrivedHeaderRow}>
              <Image
                source={require('@/assets/images/icons/checkmark-circle.png')}
                style={styles.arrivedCheckIcon}
                contentFit="contain"
              />
              <Text weight="semibold" style={styles.arrivedHeaderText}>
                YOU&apos;VE ARRIVED AT {lastStopName.toUpperCase()}
              </Text>
            </View>

            {hasNextTrip && (
              <>
                <Text weight="semibold" style={styles.recommendedLabel}>Recommended</Text>

                <View style={styles.nextTripCard}>
                  <View style={styles.nextTripTopRow}>
                    <Text weight="medium" style={styles.nextTripDuration}>{nextTripDisplay.duration}</Text>
                    <Text weight="medium" style={styles.nextTripFare}>
                      GH¢<Text weight="medium" style={styles.nextTripFareAmount}>
                        {nextTripDisplay.fare.replace('GH¢', '').trim()}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.nextTripRoute}>{nextTripDisplay.from}  →  {nextTripDisplay.to}</Text>

                  <View style={styles.nextTripButtonsRow}>
                    <TouchableOpacity style={styles.startNextButton} onPress={handleStartNextTrip}>
                      <Text style={styles.startNextButtonText}>Start Next Trip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextTripMoreButton} onPress={() => openTripOverview(true)}>
                      <Image
                        source={require('@/assets/images/icons/more-options.png')}
                        style={styles.moreButtonIcon}
                        contentFit="contain"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.orDividerRow}>
                  <View style={styles.orDividerLine} />
                  <Text weight="medium" style={styles.orDividerText}>OR</Text>
                  <View style={styles.orDividerLine} />
                </View>
              </>
            )}

            <TouchableOpacity style={styles.altOptionRow}>
              <View style={styles.altOptionIconWrap}>
                <Image
                  source={require('@/assets/images/icons/walk-outline.png')}
                  style={styles.altOptionIcon}
                  contentFit="contain"
                />
              </View>
              <View style={styles.altOptionTextGroup}>
                <Text weight="semibold" style={styles.altOptionTitle}>Walk</Text>
                <Text style={styles.altOptionDescription}>Get clear walking directions to your destination.</Text>
              </View>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.altOptionArrow}
                contentFit="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.altOptionRow} onPress={openRideOptions}>
              <View style={styles.altOptionIconWrap}>
                <Image
                  source={require('@/assets/images/icons/car-outline.png')}
                  style={styles.altOptionIcon}
                  contentFit="contain"
                />
              </View>
              <View style={styles.altOptionTextGroup}>
                <Text weight="semibold" style={styles.altOptionTitle}>Order a ride</Text>
                <Text style={styles.altOptionDescription}>Book a ride and get to your destination with ease.</Text>
              </View>
              <Image
                source={require('@/assets/images/icons/arrow-circle-right.png')}
                style={styles.altOptionArrow}
                contentFit="contain"
              />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            <View style={styles.etaRow}>
              <View>
                <Text weight="medium" style={styles.etaLabel}>ETA AFTER BOARDING</Text>
                <View style={styles.etaValueRow}>
                  <Image
                    source={require('@/assets/images/icons/estimated-time.png')}
                    style={styles.etaClockIcon}
                    contentFit="contain"
                  />
                  <Text weight="medium" style={styles.etaValue}>{currentStep.etaMins} mins</Text>
                </View>
              </View>
              <Text style={styles.stopsAwayText}>
                {Math.max(legStops.length - 1 - visitedCount, 0)}{' '}
                {stopWord(Math.max(legStops.length - 1 - visitedCount, 0))} away
              </Text>
            </View>

            <View style={styles.stopsScrollWrap}>
              <ScrollView
                style={styles.stopsScroll}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onLayout={handleScrollLayout}
                onContentSizeChange={handleScrollContentSizeChange}>
                  {legStops.map((stopName, index) => {
                    const isVisited = index < visitedCount;
                    const isCurrent = index === visitedCount;
                    const isNextUpcoming = index === visitedCount + 1;
                    const isLast = index === legStops.length - 1;

                    return (
                      <View key={stopName}>
                        <View style={styles.stopRow}>
                          <Animated.View
                            style={[
                              styles.stopDot,
                              (isVisited || isCurrent) && styles.stopDotFilled,
                              { opacity: isNextUpcoming ? pulseAnim : 1 },
                            ]}
                          />
                          <Animated.Text
                            style={[
                              styles.stopText,
                              !isVisited && !isCurrent && styles.stopTextUpcoming,
                              { opacity: isNextUpcoming ? pulseAnim : 1 },
                            ]}>
                            {stopName}
                          </Animated.Text>
                        </View>
                        {!isLast && <View style={styles.stopLine} />}
                      </View>
                    );
                  })}
              </ScrollView>

              {canScrollUp && (
                <LinearGradient
                  colors={[Palette.White, 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                  locations={[0, 0.5, 1]}
                  style={styles.fadeTop}
                  pointerEvents="none"
                />
              )}
              {canScrollDown && (
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', Palette.White]}
                  locations={[0, 0.5, 1]}
                  style={styles.fadeBottom}
                  pointerEvents="none"
                />
              )}
            </View>

            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity style={styles.endButton} onPress={handleEndJourney}>
                <Text weight="medium" style={styles.endButtonText}>End Journey</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreButton} onPress={() => openTripOverview(false)}>
                <Image
                  source={require('@/assets/images/icons/more-options.png')}
                  style={styles.moreButtonIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Ride options sheet */}
      {showRideOptions && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.rideOverlay, { opacity: rideSheetOverlayOpacity }]}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeRideOptions} />
          </Animated.View>

          <Animated.View style={[styles.rideSheet, { transform: [{ translateY: rideSheetSlide }] }]}>
            <View style={styles.dragHandle} />
            {rideOptions.map((option) => (
              <TouchableOpacity key={option.key} style={styles.rideOptionRow} onPress={closeRideOptions}>
                <Image source={option.icon} style={styles.rideOptionIcon} contentFit="contain" />
                <Text weight="medium" style={styles.rideOptionName}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      )}

      {/* Trip Overview — full multi-leg view with current + completed leg states */}
      {showTripOverview && (
        <Animated.View style={[styles.overviewPanel, { transform: [{ translateY: overviewSlide }] }]}>
          <SafeAreaView style={styles.overviewSafeArea} edges={[]}>
            <View style={styles.overviewHeader}>
              <TouchableOpacity style={styles.overviewHeaderLeft} onPress={closeTripOverview}>
                <Image
                  source={require('@/assets/images/icons/chevron-left.png')}
                  style={styles.backIcon}
                  contentFit="contain"
                />
                <Text weight="medium" style={styles.overviewTitle}>Trip Overview</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.overviewRoutePill}>
              <Text weight="medium" style={styles.overviewRouteText} numberOfLines={1}>
                {origin ?? 'Current location'}  →  {destination ?? 'Destination'}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.overviewScrollContent}>
              {overviewLegs.map((leg, index) => {
                const legKey = `${leg.from}-${leg.to}`;
                const isExpanded = expandedLegKey === legKey;
                const isCurrentLeg = !isArrivalPreview && index === activeTripIndex;
                const isCompletedLeg = isArrivalPreview ? index <= activeTripIndex : index < activeTripIndex;

                return (
                  <View
                    key={legKey}
                    style={[styles.legCard, isCurrentLeg && styles.legCardActive, isCompletedLeg && styles.legCardCompleted]}>
                    <View style={[styles.legHeaderRow, isCurrentLeg && styles.legHeaderRowActive]}>
                      <View style={styles.legHeaderLeft}>
                        <View
                          style={[
                            styles.legBadge,
                            isCurrentLeg && styles.legBadgeActive,
                            isCompletedLeg && styles.legBadgeCompleted,
                          ]}>
                          {isCompletedLeg ? (
                            <Image
                              source={require('@/assets/images/icons/checkmark-circle.png')}
                              style={styles.legBadgeCheckIcon}
                              contentFit="contain"
                              tintColor={Palette.White}
                            />
                          ) : (
                            <Text
                              weight="semibold"
                              style={[styles.legBadgeText, isCurrentLeg && styles.legBadgeTextActive]}>
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        <Text
                          weight="semibold"
                          style={[
                            styles.legHeaderText,
                            isCurrentLeg && styles.legHeaderTextActive,
                          ]}>
                          {leg.from}  →  {leg.to}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.legTrotroButton, isCurrentLeg && styles.legTrotroButtonActive]}
                        onPress={() => openTrotroSheet(leg.availableTrotro, leg.otherTrotros)}>
                        <Image
                          source={require('@/assets/images/icons/bus.png')}
                          style={styles.legTrotroButtonIcon}
                          contentFit="contain"
                          tintColor={isCurrentLeg ? Palette.White : undefined}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.legStopsColumn}>
                      <View style={styles.legStopRow}>
                        <View style={styles.legDot} />
                        <Text style={styles.legStopText}>{leg.from}</Text>
                      </View>
                      <View style={styles.legStopsLine} />

                      {isExpanded ? (
                        <>
                          {leg.intermediateStops.map((stopName, stopIndex) => (
                            <View key={stopName}>
                              <TouchableOpacity style={styles.legStopRow} onPress={() => setExpandedLegKey(null)}>
                                <View style={styles.legHollowDot} />
                                <Text style={styles.legIntermediateStopText}>{stopName}</Text>
                              </TouchableOpacity>
                              {stopIndex < leg.intermediateStops.length - 1 && (
                                <View style={styles.legStopsLine} />
                              )}
                            </View>
                          ))}
                        </>
                      ) : (
                        <TouchableOpacity style={styles.legStopRow} onPress={() => setExpandedLegKey(legKey)}>
                          <Text style={styles.legStopsBetweenText}>⋮  {leg.stopsCount} {stopWord(leg.stopsCount)}</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.legStopsLine} />
                      <View style={styles.legStopRow}>
                        <View style={styles.legDot} />
                        <Text style={styles.legStopText}>{leg.to}</Text>
                      </View>
                    </View>

                    <View style={styles.legDivider} />

                    <View style={[styles.overviewStatsRow2, styles.legStatsRow]}>
                      <View style={styles.statItem}>
                        <Image
                          source={require('@/assets/images/icons/estimated-time.png')}
                          style={styles.statIcon}
                          contentFit="contain"
                        />
                        <View>
                          <Text weight="medium" style={styles.statLabel}>Est. Time</Text>
                          <Text weight="medium" style={styles.statValue}>{leg.estTime}</Text>
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
                          <Text weight="medium" style={styles.statValue}>{leg.estFare}</Text>
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
                            <Text weight="medium" style={styles.statValue}>{leg.availability}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {activeDetailRoute && (
              <View style={styles.summaryCardFixed}>
                <Text weight="semibold" style={styles.summaryTitle}>Trip Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Number of Trips</Text>
                  <Text weight="medium" style={styles.summaryValue}>{activeDetailRoute.trips}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Time</Text>
                  <Text weight="medium" style={styles.summaryValue}>{activeDetailRoute.duration}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Fare</Text>
                  <Text weight="medium" style={styles.summaryValue}>{activeDetailRoute.fare}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Availability</Text>
                  <Text weight="medium" style={styles.summaryValue}>{overallAvailability}</Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Trotro list sheet */}
      {showTrotroSheet && trotroSheetData && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.trotroOverlay, { opacity: trotroSheetOverlayOpacity }]}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeTrotroSheet} />
          </Animated.View>

          <Animated.View style={[styles.trotroSheet, { transform: [{ translateY: trotroSheetSlide }] }]}>
            <View style={styles.dragHandle} />

            <Text weight="semibold" style={styles.trotroSheetLabel}>Available Trotro</Text>
            <View style={styles.trotroChip}>
              <Image
                source={require('@/assets/images/icons/bus.png')}
                style={styles.trotroChipIcon}
                contentFit="contain"
              />
              <Text weight="medium" style={styles.trotroChipText}>{trotroSheetData.availableTrotro}</Text>
            </View>

            {trotroSheetData.otherTrotros.length > 0 && (
              <>
                <Text weight="semibold" style={[styles.trotroSheetLabel, styles.trotroSheetLabelSpaced]}>
                  Other Trotros on Route
                </Text>
                <View style={styles.trotroListWrap}>
                  <ScrollView
                    style={styles.trotroListScroll}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleTrotroScroll}
                    scrollEventThrottle={16}
                    onLayout={handleTrotroScrollLayout}
                    onContentSizeChange={handleTrotroScrollContentSizeChange}>
                    {trotroSheetData.otherTrotros.map((name) => (
                      <View key={name} style={styles.trotroChip}>
                        <Image
                          source={require('@/assets/images/icons/bus.png')}
                          style={styles.trotroChipIcon}
                          contentFit="contain"
                        />
                        <Text weight="medium" style={styles.trotroChipText}>{name}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {trotroCanScrollUp && (
                    <LinearGradient
                      colors={[Palette.White, 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                      locations={[0, 0.5, 1]}
                      style={styles.trotroFadeTop}
                      pointerEvents="none"
                    />
                  )}
                  {trotroCanScrollDown && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', Palette.White]}
                      locations={[0, 0.5, 1]}
                      style={styles.trotroFadeBottom}
                      pointerEvents="none"
                    />
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      )}
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
    alignItems: 'center',
  },
  routeLine: {
    position: 'absolute',
    top: '10%',
    bottom: '35%',
    width: 4,
    backgroundColor: Palette.CustomBlack,
    left: '50%',
    marginLeft: -2,
  },
  currentLocationMarker: {
    position: 'absolute',
    top: '38%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.LightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationIcon: {
    width: 30,
    height: 30,
  },
  headingArrow: {
    position: 'absolute',
    top: '55%',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  headingArrowInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Palette.CustomBlack,
  },
  topCardSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarPill: {
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
  topBarRouteText: {
    flex: 1,
    fontSize: 14,
    color: Palette.CustomBlack,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.White,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  instructionTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  instructionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  instructionIcon: {
    width: 22,
    height: 22,
  },
  instructionTitle: {
    fontSize: 20,
    color: Palette.CustomBlack,
  },
  instructionDescription: {
    fontSize: 14,
    color: Palette.DarkGray,
    lineHeight: 15,
  },
  instructionArrow: {
    width: 24,
    height: 24,
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
    maxHeight: '50%',
    margin: 20,
  },
  bottomSheetArrived: {
    maxHeight: '65%',
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: Palette.LightGray,
    marginBottom: 20,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  etaLabel: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  etaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  etaClockIcon: {
    width: 20,
    height: 20,
  },
  etaValue: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  stopsAwayText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  stopsScrollWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  stopsScroll: {
    maxHeight: 180,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 20,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.Placeholder,
    backgroundColor: Palette.White,
  },
  stopDotFilled: {
    backgroundColor: Palette.CustomBlack,
    borderColor: Palette.CustomBlack,
  },
  stopText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  stopTextUpcoming: {
    color: Palette.Placeholder,
  },
  stopLine: {
    width: 1,
    height: 16,
    backgroundColor: Palette.LightGray,
    marginLeft: 4.5,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  endButton: {
    flex: 1,
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  endButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
  moreButton: {
    width: 60,
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonIcon: {
    width: 20,
    height: 20,
  },
  arrivedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 20,
  },
  arrivedCheckIcon: {
    width: 20,
    height: 20,
  },
  arrivedHeaderText: {
    fontSize: 16,
    color: Palette.CustomBlack,
    textAlign: 'center',
  },
  recommendedLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  nextTripCard: {
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  nextTripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextTripDuration: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  nextTripFare: {
    fontSize: 20,
    color: Palette.CustomBlack,
  },
  nextTripFareAmount: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  nextTripRoute: {
    fontSize: 16,
    color: Palette.DarkGray,
    marginBottom: 10,
  },
  nextTripButtonsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  startNextButton: {
    flex: 1,
    backgroundColor: Palette.CustomBlack,
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  startNextButtonText: {
    color: Palette.White,
    fontSize: 16,
  },
  nextTripMoreButton: {
    width: 60,
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.LightGray,
  },
  orDividerText: {
    fontSize: 16,
    color: Palette.DarkGray,
  },
  altOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  altOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Palette.GrayBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altOptionIcon: {
    width: 20,
    height: 20,
  },
  altOptionTextGroup: {
    flex: 1,
  },
  altOptionTitle: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 5,
  },
  altOptionDescription: {
    fontSize: 13,
    color: Palette.DarkGray,
    lineHeight: 14,
  },
  altOptionArrow: {
    width: 30,
    height: 30,
  },
  rideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rideSheet: {
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
  rideOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
  },
  rideOptionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  rideOptionName: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  overviewPanel: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.White,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  overviewSafeArea: {
    flex: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  overviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  overviewTitle: {
    fontSize: 18,
    color: Palette.CustomBlack,
  },
  overviewRoutePill: {
    backgroundColor: Palette.White,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Palette.Black,
    shadowColor: Palette.Black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  overviewRouteText: {
    fontSize: 14,
    color: Palette.CustomBlack,
  },
  overviewScrollContent: {
    paddingHorizontal: 20,
  },
  legCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.LightGray,
    marginBottom: 20,
  },
  legCardActive: {
    borderColor: Palette.CustomBlack,
    borderWidth: 1.5,
  },
  legCardCompleted: {
    opacity: 0.55,
  },
  legHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.GrayBackground,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  legHeaderRowActive: {
    backgroundColor: Palette.CustomBlack,
  },
  legHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  legTrotroButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.CustomBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legTrotroButtonActive: {
    borderColor: Palette.White,
  },
  legTrotroButtonIcon: {
    width: 20,
    height: 20,
  },
  legBadge: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: Palette.CustomBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legBadgeActive: {
    backgroundColor: Palette.White,
  },
  legBadgeCompleted: {
    backgroundColor: Palette.Green,
  },
  legBadgeCheckIcon: {
    width: 16,
    height: 16,
  },
  legBadgeText: {
    fontSize: 14,
    color: Palette.White,
  },
  legBadgeTextActive: {
    color: Palette.CustomBlack,
  },
  legHeaderText: {
    fontSize: 16,
    color: Palette.CustomBlack,
    flexShrink: 1,
  },
  legHeaderTextActive: {
    color: Palette.White,
  },
  legStopsColumn: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  legStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 20,
  },
  legDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.CustomBlack,
  },
  legHollowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Palette.DarkGray,
    backgroundColor: Palette.White,
  },
  legIntermediateStopText: {
    fontSize: 16,
    color: Palette.DarkGray,
  },
  legStopText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
  legStopsLine: {
    width: 1,
    height: 20,
    backgroundColor: Palette.LightGray,
    marginLeft: 4,
  },
  legStopsBetweenText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  legDivider: {
    height: 1,
    backgroundColor: Palette.LightGray,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  legStatsRow: {
    paddingHorizontal: 20,
  },
  overviewStatsRow2: {
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
  summaryCardFixed: {
    backgroundColor: Palette.GrayBackground,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: Palette.Placeholder,
  },
  summaryTitle: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  summaryValue: {
    fontSize: 14,
    color: Palette.CustomBlack,
  },
  trotroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trotroSheet: {
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
    maxHeight: '70%',
  },
  trotroSheetLabel: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  trotroSheetLabelSpaced: {
    marginTop: 10,
  },
  trotroListWrap: {
    position: 'relative',
  },
  trotroListScroll: {
    maxHeight: 250,
  },
  trotroFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  trotroFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  trotroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  trotroChipIcon: {
    width: 20,
    height: 20,
  },
  trotroChipText: {
    fontSize: 16,
    color: Palette.CustomBlack,
  },
});