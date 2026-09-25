// Hides Google's own shops/restaurants and transit icons so StreetMate's stops stand out.
// Roads, areas and landmarks (schools, markets, places of worship) stay visible,
// because riders use them to orient themselves.
export const STREETMATE_MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];