/**
 * Container size recommendations for meal prep
 * 
 * Provides recommendations for appropriate container sizes based on:
 * - Number of servings
 * - Recipe type (soup, solid, liquid, etc.)
 * - Storage method (freezer vs fridge)
 */

export interface ContainerRecommendation {
  servings: number;
  containerSize: string; // e.g., "16 oz", "32 oz", "1 quart"
  containerType: 'single-serve' | 'multi-serve' | 'bulk';
  quantity: number; // Number of containers needed
  volume: number; // Total volume in fluid ounces
  recommendations: string[];
  alternatives?: ContainerRecommendation[]; // Alternative container options
}

export interface ContainerSize {
  label: string; // Display label
  volumeOz: number; // Volume in fluid ounces
  volumeMl: number; // Volume in milliliters
  typicalServings: number; // Typical servings this container holds
  suitableFor: ('freezer' | 'fridge' | 'microwave' | 'oven')[];
}

// Common container sizes
const CONTAINER_SIZES: ContainerSize[] = [
  {
    label: '8 oz (1 cup)',
    volumeOz: 8,
    volumeMl: 237,
    typicalServings: 0.5,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '12 oz',
    volumeOz: 12,
    volumeMl: 355,
    typicalServings: 0.75,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '16 oz (1 pint)',
    volumeOz: 16,
    volumeMl: 473,
    typicalServings: 1,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '24 oz',
    volumeOz: 24,
    volumeMl: 710,
    typicalServings: 1.5,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '32 oz (1 quart)',
    volumeOz: 32,
    volumeMl: 946,
    typicalServings: 2,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '48 oz (1.5 quarts)',
    volumeOz: 48,
    volumeMl: 1420,
    typicalServings: 3,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '64 oz (2 quarts)',
    volumeOz: 64,
    volumeMl: 1893,
    typicalServings: 4,
    suitableFor: ['freezer', 'fridge', 'microwave'],
  },
  {
    label: '96 oz (3 quarts)',
    volumeOz: 96,
    volumeMl: 2839,
    typicalServings: 6,
    suitableFor: ['freezer', 'fridge'],
  },
  {
    label: '128 oz (1 gallon)',
    volumeOz: 128,
    volumeMl: 3785,
    typicalServings: 8,
    suitableFor: ['freezer', 'fridge'],
  },
];

/**
 * Estimate volume per serving based on recipe type
 */
function estimateVolumePerServing(recipeType?: 'soup' | 'stew' | 'solid' | 'liquid' | 'mixed'): number {
  // Default estimates in fluid ounces per serving
  const estimates: Record<string, number> = {
    soup: 12, // Soups are more liquid
    stew: 10, // Stews have more solids
    solid: 6, // Solid foods take less space
    liquid: 12, // Pure liquids
    mixed: 8, // Mixed dishes
  };

  return estimates[recipeType || 'mixed'] || 8; // Default to 8 oz per serving
}

/**
 * Get container recommendations for meal prep
 */
export function getContainerRecommendations(
  totalServings: number,
  servingsToFreeze: number,
  servingsForWeek: number,
  recipeType?: 'soup' | 'stew' | 'solid' | 'liquid' | 'mixed',
  preferSingleServe: boolean = true
): {
  freeze: ContainerRecommendation[];
  fresh: ContainerRecommendation[];
  all: ContainerRecommendation;
} {
  const volumePerServing = estimateVolumePerServing(recipeType);
  const totalVolume = totalServings * volumePerServing;

  // Recommendations for frozen portions
  const freezeRecommendations = getRecommendationsForServings(
    servingsToFreeze,
    volumePerServing,
    'freezer',
    preferSingleServe
  );

  // Recommendations for fresh portions
  const freshRecommendations = getRecommendationsForServings(
    servingsForWeek,
    volumePerServing,
    'fridge',
    preferSingleServe
  );

  // Overall recommendation
  const allRecommendation = getRecommendationsForServings(
    totalServings,
    volumePerServing,
    'fridge',
    false // For bulk, prefer larger containers
  )[0];

  return {
    freeze: freezeRecommendations,
    fresh: freshRecommendations,
    all: allRecommendation,
  };
}

/**
 * Get container recommendations for a specific number of servings
 */
function getRecommendationsForServings(
  servings: number,
  volumePerServing: number,
  storageType: 'freezer' | 'fridge',
  preferSingleServe: boolean
): ContainerRecommendation[] {
  if (servings === 0) {
    return [];
  }

  const totalVolume = servings * volumePerServing;
  const recommendations: ContainerRecommendation[] = [];

  // Strategy 1: Single-serve containers (if preferred and servings are reasonable)
  if (preferSingleServe && servings <= 12) {
    const singleServeSize = findBestContainerSize(volumePerServing, storageType);
    if (singleServeSize) {
      const quantity = Math.ceil(servings / singleServeSize.typicalServings);
      recommendations.push({
        servings,
        containerSize: singleServeSize.label,
        containerType: 'single-serve',
        quantity,
        volume: totalVolume,
        recommendations: generateRecommendations(singleServeSize, quantity, storageType, 'single-serve'),
      });
    }
  }

  // Strategy 2: Multi-serve containers (2-4 servings per container)
  if (servings >= 2) {
    const multiServeVolume = volumePerServing * 2; // 2 servings per container
    const multiServeSize = findBestContainerSize(multiServeVolume, storageType);
    if (multiServeSize) {
      const servingsPerContainer = Math.floor(multiServeSize.volumeOz / volumePerServing);
      const quantity = Math.ceil(servings / servingsPerContainer);
      recommendations.push({
        servings,
        containerSize: multiServeSize.label,
        containerType: 'multi-serve',
        quantity,
        volume: totalVolume,
        recommendations: generateRecommendations(multiServeSize, quantity, storageType, 'multi-serve'),
      });
    }
  }

  // Strategy 3: Bulk containers (for large batches)
  if (servings >= 4) {
    const bulkVolume = volumePerServing * Math.min(servings, 8); // Up to 8 servings per bulk container
    const bulkSize = findBestContainerSize(bulkVolume, storageType);
    if (bulkSize && bulkSize.volumeOz >= 32) {
      const servingsPerContainer = Math.floor(bulkSize.volumeOz / volumePerServing);
      const quantity = Math.ceil(servings / servingsPerContainer);
      recommendations.push({
        servings,
        containerSize: bulkSize.label,
        containerType: 'bulk',
        quantity,
        volume: totalVolume,
        recommendations: generateRecommendations(bulkSize, quantity, storageType, 'bulk'),
      });
    }
  }

  // Sort by preference: single-serve > multi-serve > bulk
  recommendations.sort((a, b) => {
    const order = { 'single-serve': 0, 'multi-serve': 1, 'bulk': 2 };
    return order[a.containerType] - order[b.containerType];
  });

  return recommendations.slice(0, 3); // Return top 3 recommendations
}

/**
 * Find the best container size for a given volume
 */
function findBestContainerSize(
  volumeOz: number,
  storageType: 'freezer' | 'fridge'
): ContainerSize | null {
  // Filter containers suitable for storage type
  const suitableContainers = CONTAINER_SIZES.filter(c => 
    c.suitableFor.includes(storageType)
  );

  // Find the smallest container that fits the volume (with 10% headroom)
  const targetVolume = volumeOz * 1.1;
  const bestFit = suitableContainers.find(c => c.volumeOz >= targetVolume);

  if (bestFit) {
    return bestFit;
  }

  // If no container is large enough, return the largest available
  return suitableContainers[suitableContainers.length - 1] || null;
}

/**
 * Generate recommendations and tips for container usage
 */
function generateRecommendations(
  container: ContainerSize,
  quantity: number,
  storageType: 'freezer' | 'fridge',
  containerType: 'single-serve' | 'multi-serve' | 'bulk'
): string[] {
  const recommendations: string[] = [];

  if (storageType === 'freezer') {
    recommendations.push('Use freezer-safe containers with tight-fitting lids');
    recommendations.push('Leave 1/2 inch headspace for expansion when freezing');
    if (container.suitableFor.includes('microwave')) {
      recommendations.push('Thaw in refrigerator overnight, then reheat in microwave-safe container');
    }
  } else {
    recommendations.push('Use airtight containers to maintain freshness');
    if (container.suitableFor.includes('microwave')) {
      recommendations.push('Container is microwave-safe for easy reheating');
    }
  }

  if (containerType === 'single-serve') {
    recommendations.push('Perfect for grab-and-go meals');
    recommendations.push('Easy to portion control');
  } else if (containerType === 'multi-serve') {
    recommendations.push('Good for family meals or meal sharing');
    recommendations.push('Portion out servings as needed');
  } else {
    recommendations.push('Best for bulk storage');
    recommendations.push('Portion into smaller containers when ready to use');
  }

  if (quantity > 1) {
    recommendations.push(`You'll need ${quantity} container${quantity !== 1 ? 's' : ''} of this size`);
  }

  return recommendations;
}

/**
 * Format container recommendation for display
 */
export function formatContainerRecommendation(rec: ContainerRecommendation): string {
  return `${rec.quantity}x ${rec.containerSize} (${rec.containerType.replace('-', ' ')})`;
}

