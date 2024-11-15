
export const ROUTE_ICONS: Record<string, string> = {
    '/store': '/icons/shopping-bag.svg',
    '/inventory': '/icons/chest.svg',
    '/bud-box': '/icons/animal-skull.svg',
    '/farming': '/icons/seedling.svg',
    '/woodcutting': '/icons/wood-pile.svg',
    '/crafting': '/icons/hammer-nails.svg',
    '/fishing': '/icons/fishing-pole.svg',
    '/cooking': '/icons/cooking-pot.svg',
    '/mining': '/icons/mining.svg',
    '/smithing': '/icons/anvil.svg',
  };
  
  export const ROUTE_TITLES: Record<string, string> = {
    '/': 'Home',
    '/store': 'Store',
    '/inventory': 'Inventory',
    '/bud-box': 'Bud Box',
    '/level': 'Level',
    '/attack': 'Attack',
    '/defense': 'Defense',
    '/health': 'Health',
    '/efficiency': 'Efficiency',
    '/farming': 'Farming',
    '/woodcutting': 'Woodcutting',
    '/crafting': 'Crafting',
    '/fishing': 'Fishing',
    '/cooking': 'Cooking',
    '/mining': 'Mining',
    '/smithing': 'Smithing',
    '/completion-log': 'Completion Log',
    '/lore': 'Lore',
    '/statistics': 'Statistics',
    '/settings': 'Settings',
    '/news': 'News & Changelog',
    '/bug-report': 'Report a Bug',
    '/privacy': 'Privacy Policy',
  };
  
  // You can also add route paths as constants to avoid typos
  export const ROUTES = {
    HOME: '/',
    STORE: '/store',
    INVENTORY: '/inventory',
    BUD_BOX: '/bud-box',
    LEVEL: '/level',
    ATTACK: '/attack',
    DEFENSE: '/defense',
    HEALTH: '/health',
    EFFICIENCY: '/efficiency',
    FARMING: '/farming',
    WOODCUTTING: '/woodcutting',
    CRAFTING: '/crafting',
    FISHING: '/fishing',
    COOKING: '/cooking',
    MINING: '/mining',
    SMITHING: '/smithing',
    COMPLETION_LOG: '/completion-log',
    LORE: '/lore',
    STATISTICS: '/statistics',
    SETTINGS: '/settings',
    NEWS: '/news',
    BUG_REPORT: '/bug-report',
    PRIVACY: '/privacy',
  } as const;
  
  // Type for the routes
  export type RoutePath = typeof ROUTES[keyof typeof ROUTES];