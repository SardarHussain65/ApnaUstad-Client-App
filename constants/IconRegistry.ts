/**
 * Semantic Icon Registry
 * Maps semantic icon identifiers to lucide-react-native components
 * 
 * Benefits:
 * - Database stores semantic names, not implementation details
 * - Can switch icon libraries without changing database
 * - Automatically handles new categories added by admins
 * - Provides smart fallbacks
 */

import {
  Zap,
  Droplets,
  Wind,
  Hammer,
  Paintbrush,
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

/**
 * Semantic icon identifiers to component mapping
 * Add new semantic icons here, not in Category model
 */
export const SEMANTIC_ICON_REGISTRY: Record<string, any> = {
  'electrical': Zap,
  'plumbing': Droplets,
  'education': GraduationCap,  // New entry
  'hvac': Wind,
  'construction': Hammer,
  'painting': Paintbrush,
  'mechanical': Wrench,
  'automotive': Car,
  'solar': Sun,
  'electronics': Laptop,
  'mobile': Smartphone,
  'textiles': Scissors,
  'roofing': Home,
  'security': Camera,
  'pest_control': Bug,
  'gardening': Leaf,
  'transportation': Truck,
  'power_systems': Lightbulb,
  'cleaning': Droplets,
};

/**
 * Legacy icon name mappings for backward compatibility
 * If a category has the old icon format, this maps it to semantic
 */
export const LEGACY_TO_SEMANTIC_MAP: Record<string, string> = {
  'zap': 'electrical',
  'droplets': 'plumbing',
  'wind': 'hvac',
  'hammer': 'construction',
  'paintbrush': 'painting',
  'wrench': 'mechanical',
  'car': 'automotive',
  'sunny': 'solar',
  'laptop': 'electronics',
  'phone-portrait': 'mobile',
  'cut': 'textiles',
  'home': 'roofing',
  'camera': 'security',
  'bug': 'pest_control',
  'leaf': 'gardening',
  'truck': 'transportation',
  'lightbulb': 'power_systems',
};

/**
 * Get icon component for a category
 * 
 * Smart resolution:
 * 1. Try semantic icon from database
 * 2. Try legacy to semantic mapping
 * 3. Try category name mapping
 * 4. Fallback to Sparkles
 * 
 * @param category - Category object from API
 * @returns Lucide icon component
 */
export function getIconForCategory(category: any): any {
  if (!category) return Sparkles;

  // 1. Try direct semantic icon lookup
  if (category.icon && SEMANTIC_ICON_REGISTRY[category.icon]) {
    return SEMANTIC_ICON_REGISTRY[category.icon];
  }

  // 2. Try legacy to semantic mapping
  if (category.icon && LEGACY_TO_SEMANTIC_MAP[category.icon]) {
    const semanticIcon = LEGACY_TO_SEMANTIC_MAP[category.icon];
    return SEMANTIC_ICON_REGISTRY[semanticIcon] || Sparkles;
  }

  // 3. Try mapping by category name (fallback)
  const nameLowercase = category.name?.toLowerCase() || '';
  for (const [key, value] of Object.entries(SEMANTIC_ICON_REGISTRY)) {
    if (nameLowercase.includes(key)) {
      return value;
    }
  }

  // 4. Default fallback
  return Sparkles;
}

/**
 * Check if a category icon is properly mapped
 * Useful for debugging or logging unmapped categories
 * 
 * @param category - Category object
 * @returns true if icon is properly mapped, false if using fallback
 */
export function isCategoryIconMapped(category: any): boolean {
  if (!category) return false;
  
  const icon = getIconForCategory(category);
  return icon !== Sparkles;
}

/**
 * Get list of all unmapped icons (for debugging)
 * @param categories - Array of categories
 * @returns Array of unmapped category names
 */
export function getUnmappedCategories(categories: any[]): string[] {
  return categories
    .filter(cat => !isCategoryIconMapped(cat))
    .map(cat => cat.name);
}
