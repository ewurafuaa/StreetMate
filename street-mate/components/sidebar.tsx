import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Palette } from '@/constants/theme';

import { AppText as Text } from '@/components/app-text';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.78;


const menuItems = [
  { key: 'home', label: 'Home', icon: require('@/assets/images/icons/home-20-regular.png') },
  { key: 'recent', label: 'Recent Trips', icon: require('@/assets/images/icons/clock-3.png') },
  { key: 'saved', label: 'Saved Places', icon: require('@/assets/images/icons/map-pin-house.png') },
  { key: 'routehub', label: 'Route Hub', icon: require('@/assets/images/icons/map-20-regular.png') },
  { key: 'tips', label: 'Tips', icon: require('@/assets/images/icons/LightBulbOutline.png') },
  { key: 'about', label: 'About', icon: require('@/assets/images/icons/info-circle.png') },
];

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
  activeKey?: string;
  onSelect?: (key: string) => void;
};

export function Sidebar({ visible, onClose, activeKey = 'home', onSelect }: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [darkModeOn, setDarkModeOn] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideAnim, overlayAnim]);

  if (!visible) {
    // Still render while animating out; skip entirely when fully closed and not visible.
    // Simple approach: only skip pointer events, keep mounted for smooth animation.
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <Image
          source={require('@/assets/images/streetmate-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => onSelect?.(item.key)}>
                <Image source={item.icon} style={styles.menuIcon} contentFit="contain" />
                <Text weight={isActive ? 'medium' : 'regular'} style={styles.menuLabel}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.darkModeRow}>
          <Text style={styles.darkModeLabel}>Dark Mode</Text>
          <Switch
            value={darkModeOn}
            onValueChange={setDarkModeOn}
            trackColor={{ false: '#E9E9E9', true: '#3FCF22' }}
            thumbColor={Palette.White}
            ios_backgroundColor={Palette.Placeholder}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 230,
    backgroundColor: '#FFFFFF',
    paddingTop: 80,
    paddingHorizontal: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: {
    width: 156,
    height: 32,
    marginBottom: 40,
    alignSelf: 'center',
  },
  menuList: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  menuItemActive: {
    backgroundColor: '#E9E9E9',
  },
  menuIcon: {
    width: 20,
    height: 20,
  },
  menuLabel: {
    fontSize: 16,
    color: '#181818',
  },
  divider: {
    height: 1,
    backgroundColor: '#BABABA',
    marginTop: 20,
    marginBottom: 16,
  },
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkModeLabel: {
    fontSize: 15,
    color: '#181818',
  },
});