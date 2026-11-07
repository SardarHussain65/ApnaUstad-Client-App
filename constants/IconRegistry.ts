/**
 * Semantic Icon Registry
 * Maps semantic icon identifiers to lucide-react-native components
 */

import {
  Zap,
  Droplets,
  Snowflake,
  Hammer,
  PaintRoller,
  SprayCan,
  GraduationCap,
  Wrench,
  Car,
  Sun,
  Laptop,
  Smartphone,
  Scissors,
  Home,
  Camera,
  Bug,
  Leaf,
  Truck,
  Shield,
  Lightbulb,
  Sparkles,
} from 'lucide-react-native';

export const SEMANTIC_ICON_REGISTRY: Record<string, any> = {
  electrical: Zap,
  plumbing: Droplets,
  education: GraduationCap,
  hvac: Snowflake,
  ac: Snowflake,
  appliance: Snowflake,
  construction: Hammer,
  painting: PaintRoller,
  renovation: PaintRoller,
  mechanical: Wrench,
  automotive: Car,
  solar: Sun,
  electronics: Laptop,
  mobile: Smartphone,
  textiles: Scissors,
  roofing: Home,
  security: Camera,
  pest_control: Bug,
  gardening: Leaf,
  transportation: Truck,
  power_systems: Lightbulb,
  cleaning: SprayCan,
};

export const LEGACY_TO_SEMANTIC_MAP: Record<string, string> = {
  zap: 'electrical',
  droplets: 'plumbing',
  wind: 'hvac',
  snowflake: 'hvac',
  hammer: 'construction',
  paintbrush: 'painting',
  'paint-roller': 'painting',
  'spray-can': 'cleaning',
  wrench: 'mechanical',
  car: 'automotive',
  sunny: 'solar',
  laptop: 'electronics',
  'phone-portrait': 'mobile',
  cut: 'textiles',
  home: 'roofing',
  camera: 'security',
  bug: 'pest_control',
  leaf: 'gardening',
  truck: 'transportation',
  lightbulb: 'power_systems',
};

export function getIconForCategory(category: any): any {
  if (!category) return Sparkles;

  const nameLower = (category.name || '').toLowerCase();

  // Priority name matching so "AC & Appliances", "Home Cleaning", "Painting & Renovation"
  // always get their distinct semantic icons even if database icon field is generic
  if (nameLower.includes('ac') || nameLower.includes('appliance') || nameLower.includes('cool') || nameLower.includes('hvac')) {
    return Snowflake;
  }
  if (nameLower.includes('clean') || nameLower.includes('wash') || nameLower.includes('maid')) {
    return SprayCan;
  }
  if (nameLower.includes('paint') || nameLower.includes('renov')) {
    return PaintRoller;
  }
  if (nameLower.includes('plumb') || nameLower.includes('water') || nameLower.includes('pipe')) {
    return Droplets;
  }
  if (nameLower.includes('electr') || nameLower.includes('wiring')) {
    return Zap;
  }

  // 1. Try direct semantic icon lookup
  if (category.icon && SEMANTIC_ICON_REGISTRY[category.icon]) {
    return SEMANTIC_ICON_REGISTRY[category.icon];
  }

  // 2. Try legacy to semantic mapping
  if (category.icon && LEGACY_TO_SEMANTIC_MAP[category.icon]) {
    const semanticIcon = LEGACY_TO_SEMANTIC_MAP[category.icon];
    return SEMANTIC_ICON_REGISTRY[semanticIcon] || Sparkles;
  }

  // 3. Try mapping by category name substring
  for (const [key, value] of Object.entries(SEMANTIC_ICON_REGISTRY)) {
    if (nameLower.includes(key)) {
      return value;
    }
  }

  // 4. Default fallback
  return Sparkles;
}

export function isCategoryIconMapped(category: any): boolean {
  if (!category) return false;
  const icon = getIconForCategory(category);
  return icon !== Sparkles;
}

export function getUnmappedCategories(categories: any[]): string[] {
  return categories
    .filter(cat => !isCategoryIconMapped(cat))
    .map(cat => cat.name);
}
