import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Animated, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { useRef } from 'react';

// Mock trip history — replace with real stored trip data later.
const recentTripsData = [
  {
    id: '1',
    section: 'Within The Week',
    duration: '35 mins',
    fare: 'GH¢ 9.50',
    stops: ['Pantang Junction', 'Madina', 'UPS'],
    tripsCount: 2,
    dateLabel: 'Today',
    time: '09:41 am',
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
    id: '2',
    section: 'Within The Week',
    duration: '1 hr 15 mins',
    fare: 'GH¢ 11.00',
    stops: ['Legon 1st', 'Las Palmas', 'Bafana'],
    tripsCount: 2,
    dateLabel: 'Yesterday',
    time: '03:20 pm',
    tripDetails: [
      {
        stopName: 'Las Palmas',
        availableTrotro: 'Circle',
        otherTrotros: 'Achimota, Lapaz, Kasoa, Osu, Madina',
        estTime: '40 mins',
        estFare: 'GH¢ 6.00',
        availability: 'Medium',
        stopsCount: 3,
        intermediateStops: ['37 Station', 'Shiashie', 'Ridge'],
      },
      {
        stopName: 'Bafana',
        availableTrotro: 'Bafana',
        otherTrotros: 'Osu, Labadi, Teshie',
        estTime: '35 mins',
        estFare: 'GH¢ 5.00',
        availability: 'High',
        stopsCount: 2,
        intermediateStops: ['Airport Junction', 'Cantonments'],
      },
    ],
  },
  {
    id: '3',
    section: 'Last Week',
    duration: '21 mins',
    fare: 'GH¢ 3.50',
    stops: ['Okponglo', 'Spanner'],
    tripsCount: 1,
    dateLabel: '10/06/26',
    time: '11:37 am',
    tripDetails: [
      {
        stopName: 'Spanner',
        availableTrotro: 'Legon',
        otherTrotros: 'Okponglo, 37, Circle, Madina',
        estTime: '21 mins',
        estFare: 'GH¢ 3.50',
        availability: 'High',
        stopsCount: 2,
        intermediateStops: ['Legon Boundary', 'Shiashie'],
      },
    ],
  },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const stopWord = (count: number) => (count === 1 ? 'stop' : 'stops');
const tripWord = (count: number) => (count === 1 ? 'Trip' : 'Trips');

const availabilityRank: Record<string, number> = { High: 2, Medium: 1, Low: 0 };
const worstAvailability = (values: string[]) =>
  values.reduce((worst, current) => (availabilityRank[current] < availabilityRank[worst] ? current : worst), values[0]);

export default function RecentTripsScreen() {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [expandedLegKey, setExpandedLegKey] = useState<string | null>(null);
  const overviewSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const selectedTrip = recentTripsData.find((t) => t.id === selectedTripId) ?? null;

  const overviewLegs = selectedTrip
    ? selectedTrip.tripDetails.map((trip, index) => ({
        from: index === 0 ? selectedTrip.stops[0] : selectedTrip.tripDetails[index - 1].stopName,
        to: trip.stopName,
        stopsCount: trip.stopsCount,
        intermediateStops: trip.intermediateStops ?? [],
        estTime: trip.estTime,
        estFare: trip.estFare,
        availability: trip.availability,
      }))
    : [];

  const overallAvailability = selectedTrip
    ? worstAvailability(selectedTrip.tripDetails.map((t) => t.availability))
    : 'High';

  const openTripOverview = (tripId: string) => {
    setExpandedLegKey(null);
    setSelectedTripId(tripId);
    Animated.spring(overviewSlide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }).start();
  };

  const closeTripOverview = () => {
    Animated.timing(overviewSlide, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() =>
      setSelectedTripId(null)
    );
  };

  // Group trips by their section label, preserving the order they appear in the data array
  const sections = recentTripsData.reduce<{ title: string; trips: typeof recentTripsData }[]>((acc, trip) => {
    const existing = acc.find((s) => s.title === trip.section);
    if (existing) {
      existing.trips.push(trip);
    } else {
      acc.push({ title: trip.section, trips: [trip] });
    }
    return acc;
  }, []);

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
        <Text weight="medium" style={styles.headerTitle}>Recent Trips</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text weight="semibold" style={styles.sectionTitle}>{section.title}</Text>

            {section.trips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard} onPress={() => openTripOverview(trip.id)}>
                <View style={styles.tripTopRow}>
                  <Text weight="medium" style={styles.tripDuration}>{trip.duration}</Text>
                  <Text weight="medium" style={styles.tripFare}>
                    GH¢<Text weight="medium" style={styles.tripFareAmount}>
                      {trip.fare.replace('GH¢', '').trim()}
                    </Text>
                  </Text>
                </View>

                <Text numberOfLines={1} style={styles.tripStops}>
                  {trip.stops.join('  →  ')}
                </Text>

                <View style={styles.tripBottomRow}>
                  <View style={styles.tripCountGroup}>
                    <Image
                      source={require('@/assets/images/icons/trip-icon.png')}
                      style={styles.tripCountIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.tripCountText}>{trip.tripsCount} {tripWord(trip.tripsCount)}</Text>
                  </View>
                  <Text style={styles.tripDateText}>{trip.dateLabel} · {trip.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Trip Overview — same sliding panel pattern used in map.tsx / journey.tsx */}
      {selectedTrip && (
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
                {selectedTrip.stops[0]}  →  {selectedTrip.stops[selectedTrip.stops.length - 1]}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.overviewScrollContent}>
              {overviewLegs.map((leg, index) => {
                const legKey = `${leg.from}-${leg.to}`;
                const isExpanded = expandedLegKey === legKey;

                return (
                  <View key={legKey} style={styles.legCard}>
                    <View style={styles.legHeaderRow}>
                      <View style={styles.legBadge}>
                        <Text weight="semibold" style={styles.legBadgeText}>{index + 1}</Text>
                      </View>
                      <Text weight="semibold" style={styles.legHeaderText}>
                        {leg.from}  →  {leg.to}
                      </Text>
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

                    <View style={styles.legStatsRow}>
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

            <View style={styles.summaryCardFixed}>
              <Text weight="semibold" style={styles.summaryTitle}>Trip Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Number of Trips</Text>
                <Text weight="medium" style={styles.summaryValue}>{selectedTrip.tripsCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Time</Text>
                <Text weight="medium" style={styles.summaryValue}>{selectedTrip.duration}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Fare</Text>
                <Text weight="medium" style={styles.summaryValue}>{selectedTrip.fare}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Availability</Text>
                <Text weight="medium" style={styles.summaryValue}>{overallAvailability}</Text>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  tripCard: {
    borderWidth: 1,
    borderColor: Palette.LightGray,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  tripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tripDuration: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  tripFare: {
    fontSize: 20,
    color: Palette.CustomBlack,
  },
  tripFareAmount: {
    fontSize: 24,
    color: Palette.CustomBlack,
  },
  tripStops: {
    fontSize: 16,
    color: Palette.CustomBlack,
    marginBottom: 10,
  },
  tripBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripCountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tripCountIcon: {
    width: 16,
    height: 16,
  },
  tripCountText: {
    fontSize: 14,
    color: Palette.DarkGray,
  },
  tripDateText: {
    fontSize: 14,
    color: Palette.DarkGray,
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
  legHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.GrayBackground,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  legBadge: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: Palette.CustomBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legBadgeText: {
    fontSize: 14,
    color: Palette.White,
  },
  legHeaderText: {
    fontSize: 16,
    color: Palette.CustomBlack,
    flexShrink: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    width: 10,
    height: 10,
    borderRadius: 5,
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
});