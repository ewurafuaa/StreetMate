import { createContext, useContext, useState, ReactNode } from 'react';

export type SavedPlace = {
  id: string;
  label: string;
  address: string;
  icon: 'home' | 'work' | 'star';
};

type SavedPlacesContextValue = {
  places: SavedPlace[];
  addPlace: (label: string, address: string) => void;
  removePlace: (id: string) => void;
  updatePlace: (id: string, patch: Partial<Omit<SavedPlace, 'id'>>) => void;
};

const SavedPlacesContext = createContext<SavedPlacesContextValue | undefined>(undefined);

// Starting mock data — Home and Work exist as slots with no address yet,
// so the UI prompts "Add Home" / "Add Work" until the user sets one.
const initialPlaces: SavedPlace[] = [
  { id: '1', label: 'Home', address: '', icon: 'home' },
  { id: '2', label: 'Work', address: '', icon: 'work' },
];

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<SavedPlace[]>(initialPlaces);

  const addPlace = (label: string, address: string) => {
    setPlaces((prev) => [...prev, { id: Date.now().toString(), label, address, icon: 'star' }]);
  };

  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePlace = (id: string, patch: Partial<Omit<SavedPlace, 'id'>>) => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <SavedPlacesContext.Provider value={{ places, addPlace, removePlace, updatePlace }}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces() {
  const ctx = useContext(SavedPlacesContext);
  if (!ctx) throw new Error('useSavedPlaces must be used within SavedPlacesProvider');
  return ctx;
}