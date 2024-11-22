// stores/features/activity.store.ts
import { create } from 'zustand';
import { createSelectors } from '../utils/store.utils';

interface Activity {
  type: 'gathering' | 'crafting';
  nodeId: string;
  recipeId?: string;
}

interface ActivityState {
  hunterActivity: Activity | null;
  budActivities: Record<string, Activity & { budId: string }>;
  fractionalProgress: Record<string, {
    items: Record<string, number>;
    xp: Record<string, number>;
  }>;
}

interface ActivityActions {
  startActivity: <T extends 'hunter' | 'bud'>(
    type: T,
    activityData: T extends 'hunter' ? Activity : Activity & { budId: string }
  ) => void;
  stopActivity: (type: 'hunter' | 'bud', id?: string) => void;
  getBudActivity: (budId: string) => (Activity & { budId: string }) | null;
  updateProgress: (deltaTime: number) => void;
  resetActivities: () => void;
}

const useActivityStoreBase = create<ActivityState & ActivityActions>((set, get) => ({
  hunterActivity: null,
  budActivities: {},
  fractionalProgress: {},

  getBudActivity: (budId: string) => {
    const state = get();
    return state.budActivities[budId] || null;
  },

  startActivity: (type, activityData) => set((state) => {
    if (type === 'hunter') {
      return { hunterActivity: activityData as Activity };
    }
    const budActivity = activityData as Activity & { budId: string };
    return {
      budActivities: {
        ...state.budActivities,
        [budActivity.budId]: budActivity
      }
    };
  }),

  stopActivity: (type, id) => set((state) => {
    if (type === 'hunter') {
      return { hunterActivity: null };
    }
    if (id) {
      const newActivities = { ...state.budActivities };
      delete newActivities[id];
      return { budActivities: newActivities };
    }
    return state;
  }),

  updateProgress: (deltaTime) => set((state) => {
    const newFractionalProgress = { ...state.fractionalProgress };
    
    // Process hunter activity
    if (state.hunterActivity) {
      const actorId = 'hunter';
      if (!newFractionalProgress[actorId]) {
        newFractionalProgress[actorId] = { items: {}, xp: {} };
      }
      
      // Initialize or update progress for hunter
      const nodeId = state.hunterActivity.nodeId;
      newFractionalProgress[actorId].items[nodeId] = 
        (newFractionalProgress[actorId].items[nodeId] || 0) + deltaTime;
      newFractionalProgress[actorId].xp[nodeId] = 
        (newFractionalProgress[actorId].xp[nodeId] || 0) + deltaTime;
    }

    // Process bud activities
    Object.entries(state.budActivities).forEach(([budId, activity]) => {
      if (!newFractionalProgress[budId]) {
        newFractionalProgress[budId] = { items: {}, xp: {} };
      }
      
      // Initialize or update progress for each bud
      const nodeId = activity.nodeId;
      newFractionalProgress[budId].items[nodeId] = 
        (newFractionalProgress[budId].items[nodeId] || 0) + deltaTime;
      newFractionalProgress[budId].xp[nodeId] = 
        (newFractionalProgress[budId].xp[nodeId] || 0) + deltaTime;
    });

    return {
      fractionalProgress: newFractionalProgress
    };
  }),

  resetActivities: () => set({
    hunterActivity: null,
    budActivities: {},
    fractionalProgress: {}
  }),
}));

export const useActivityStore = createSelectors(useActivityStoreBase);