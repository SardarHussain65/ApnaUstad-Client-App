import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Home, ClipboardList, Wallet, User, Compass } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsRTL } from '../../context/LanguageContext';

const HORIZONTAL_MARGIN = 20;
const BAR_HEIGHT = 74;
const PILL_MARGIN_H = 6;
const PILL_HEIGHT = 58;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = useIsRTL();
  const { width: screenWidth } = useWindowDimensions();

  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options as any;
    return opts?.href !== null && opts?.tabBarItemStyle?.display !== 'none';
  });

  const numTabs = visibleRoutes.length || 4;
  const tabBarWidth = screenWidth - HORIZONTAL_MARGIN * 2;
  const tabWidth = tabBarWidth / numTabs;
  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === activeRoute?.key);

  const indicatorWidth = Math.max(48, tabWidth - PILL_MARGIN_H * 2);
  const indicatorOffset = (tabWidth - indicatorWidth) / 2;

  const getTargetX = (index: number) => {
    const safeIndex = Math.max(0, index);
    const visualIndex = isRTL ? numTabs - 1 - safeIndex : safeIndex;
    return visualIndex * tabWidth + indicatorOffset;
  };

  const translateX = useSharedValue(getTargetX(activeVisibleIndex));

  useEffect(() => {
    translateX.value = withSpring(getTargetX(activeVisibleIndex), {
      damping: 20,
      stiffness: 160,
      mass: 0.8,
    });
  }, [activeVisibleIndex, tabWidth, isRTL]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  const bottomMargin = Platform.OS === 'ios'
    ? (insets.bottom > 0 ? insets.bottom : 14)
    : (insets.bottom > 0 ? insets.bottom + 10 : 14);

  return (
    <View
      style={[
        styles.container,
        {
          bottom: bottomMargin,
          backgroundColor: theme.colors.tabBar.background,
          borderColor: theme.colors.tabBar.border,
        },
      ]}
    >
      {/* Wide Rounded-Rectangle Active Pill Indicator covering both icon + label */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: indicatorWidth,
            height: PILL_HEIGHT,
            borderRadius: 20,
            backgroundColor: theme.colors.tabBar.activeBackground,
            borderColor: theme.colors.tabBar.activeBorder,
            borderWidth: theme.colors.tabBar.activeBorder !== 'transparent' ? 1 : 0,
          },
          indicatorStyle,
        ]}
      />

      <View style={styles.tabsRow}>
        {visibleRoutes.map((route) => {
          const isFocused = activeRoute?.key === route.key;

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              onPress={() => handlePress(route, isFocused)}
              routeName={route.name}
              activeColor={theme.colors.tabBar.activeIcon}
              inactiveColor={theme.colors.tabBar.inactiveIcon}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  isFocused,
  onPress,
  routeName,
  activeColor,
  inactiveColor,
}: {
  isFocused: boolean;
  onPress: () => void;
  routeName: string;
  activeColor: string;
  inactiveColor: string;
}) {
  const { t } = useTranslation();

  const Icon = ({ color }: { color: string }) => {
    const size = 23;
    const strokeWidth = isFocused ? 2.4 : 2.1;
    switch (routeName) {
      case 'index':
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
      case 'jobs':
        return <Compass size={size} color={color} strokeWidth={strokeWidth} />;
      case 'bookings':
        return <ClipboardList size={size} color={color} strokeWidth={strokeWidth} />;
      case 'wallet':
        return <Wallet size={size} color={color} strokeWidth={strokeWidth} />;
      case 'profile':
        return <User size={size} color={color} strokeWidth={strokeWidth} />;
      default:
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  const getLabel = () => {
    switch (routeName) {
      case 'index':
        return t('tabs.home', 'Home');
      case 'jobs':
        return t('tabs.jobs', 'Find Jobs');
      case 'bookings':
        return t('tabs.bookings', 'Bookings');
      case 'wallet':
        return t('tabs.wallet', 'Wallet');
      case 'profile':
        return t('tabs.profile', 'Profile');
      default:
        return '';
    }
  };

  const itemColor = isFocused ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <View style={styles.tabInner}>
        <Icon color={itemColor} />
        <Text
          style={[
            styles.tabLabel,
            {
              color: itemColor,
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {getLabel()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: HORIZONTAL_MARGIN,
    right: HORIZONTAL_MARGIN,
    height: BAR_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.6,
    justifyContent: 'center',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2 - 1.5,
    left: 0,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
});
