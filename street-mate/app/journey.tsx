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

// Mock journey steps — replace with real navigation/tracking engine output later.
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

// Mock recommended next leg — replace with real routing engine output once this trip ends.
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

const STEP_ADVANCE_INTERVAL = 6000; // demo-only: auto-advances every 6s
const SCREEN_HEIGHT = Dimensions.get('window').height;

const stopWord = (count: number) => (count === 1 ? 'stop' : 'stops');

export default function JourneyScreen() {
  const { origin, destination, tripIndex, totalTrips } = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    tripIndex?: string;
    totalTrips?: string;
  }>();
  const [stepIndex, setStepIndex] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContentHeight = useRef(0);
  const scrollLayoutHeight = useRef(0);

  const [showRideOptions, setShowRideOptions] = useState(false);
  const rideSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const rideSheetOverlayOpacity = useRef(new Animated.Value(0)).current;

  const currentStep = mockJourneySteps[Math.min(stepIndex, mockJourneySteps.length - 1)];
  const lastStopName = mockStops[mockStops.length - 1];
  const isLastStop = visitedCount === mockStops.length - 1;

  const currentTripIndexNum = Number(tripIndex ?? 0);
  const totalTripsNum = Number(totalTrips ?? 1);
  const hasNextTrip = currentTripIndexNum < totalTripsNum - 1;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = Math.min(prev + 1, mockJourneySteps.length - 1);
        if (next !== prev) {
          Animated.sequence([
            Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
        return next;
      });
      setVisitedCount((prev) => Math.min(prev + 1, mockStops.length - 1));
    }, STEP_ADVANCE_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    router.back();
  };

  const handleStartNextTrip = () => {
    // Reset the mock demo so the next leg can play out the same way.
    setHasArrived(false);
    setStepIndex(0);
    setVisitedCount(0);
  };

  const openRideOptions = () => {
    setShowRideOptions(true);
    Animated.parallel([
      Animated.timing(rideSheetOverlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(rideSheetSlide, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 60,
      }),
    ]).start();
  };

  const closeRideOptions = () => {
    Animated.parallel([
      Animated.timing(rideSheetOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rideSheetSlide, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowRideOptions(false));
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
                    <Text weight="medium" style={styles.nextTripDuration}>{mockNextTrip.duration}</Text>
                    <Text weight="medium" style={styles.nextTripFare}>
                      GH¢<Text weight="medium" style={styles.nextTripFareAmount}>
                        {mockNextTrip.fare.replace('GH¢', '').trim()}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.nextTripRoute}>{mockNextTrip.from}  →  {mockNextTrip.to}</Text>

                  <View style={styles.nextTripButtonsRow}>
                    <TouchableOpacity style={styles.startNextButton} onPress={handleStartNextTrip}>
                      <Text style={styles.startNextButtonText}>Start Next Trip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextTripMoreButton}>
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
                {currentStep.stopsAway} {stopWord(currentStep.stopsAway)} away
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
                {mockStops.map((stopName, index) => {
                  const isVisited = index < visitedCount;
                  const isCurrent = index === visitedCount;
                  const isLast = index === mockStops.length - 1;

                  return (
                    <View key={stopName}>
                      <View style={styles.stopRow}>
                        <View
                          style={[
                            styles.stopDot,
                            (isVisited || isCurrent) && styles.stopDotFilled,
                          ]}
                        />
                        <Text
                          weight={isCurrent ? 'regular' : 'regular'}
                          style={[
                            styles.stopText,
                            !isVisited && !isCurrent && styles.stopTextUpcoming,
                          ]}>
                          {stopName}
                        </Text>
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
              <TouchableOpacity style={styles.moreButton}>
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

      {/* Ride options sheet — slides up with a blurred backdrop, same pattern as the sidebar */}
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
    margin: 20
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
});