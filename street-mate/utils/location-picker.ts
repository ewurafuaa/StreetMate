// Bridges the "set location on map" flow back to whichever screen requested it.
// The requesting screen registers a handler before navigating; set-location calls
// deliverLocation on confirm, then pops back. Using router.back() rather than
// pushing params onto a fresh route-hub instance keeps that screen mounted, so
// its other fields keep whatever the user already entered.

type LocationHandler = (value: string) => void;

let pendingHandler: LocationHandler | null = null;

export function requestLocation(handler: LocationHandler) {
  pendingHandler = handler;
}

export function deliverLocation(value: string) {
  const handler = pendingHandler;
  pendingHandler = null;
  handler?.(value);
}

export function cancelLocationRequest() {
  pendingHandler = null;
}

export function hasPendingLocationRequest() {
  return pendingHandler !== null;
}