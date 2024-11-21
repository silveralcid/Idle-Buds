import { GameState } from '../types/gameState.types';
import { allResources } from '../data/allResources.data';
import { useBankStore } from '../stores/bank.store';
import { useHunterStore } from '../stores/hunter.store';
import { useResourceAssignmentStore } from '../stores/resourceAssignment.store';
import { calculateResourceGain, calculateExperienceGain } from '../utils/resourceCalculation.utils';
import { defaultSkillMapping } from '../data/defaultSkillMapping';

export const updateHunterResources = (state: GameState, deltaTime: number) => {
  if (state.currentActivity) {
    const resource = allResources.find(r => r.id === state.currentActivity);
    if (resource) {
      const { wholeAmount, newFraction } = calculateResourceGain(resource.gatherRate, deltaTime, state.fractionalResources[resource.id] || 0);
      const skillId = defaultSkillMapping[resource.type];
      const { wholeXP, newXPFraction } = calculateExperienceGain(resource.experienceGain, deltaTime, state.fractionalXP[skillId] || 0);

      useBankStore.getState().addResource(resource.id, wholeAmount);
      useHunterStore.getState().increaseSkillExperience(skillId, wholeXP);

      return {
        ...state,
        fractionalResources: {
          ...state.fractionalResources,
          [resource.id]: newFraction,
        },
        fractionalXP: {
          ...state.fractionalXP,
          [skillId]: newXPFraction,
        },
      };
    }
  }
  return state;
};

export const updateBudResources = (state: GameState, deltaTime: number) => {
  if (state.budActivity) {
    const resource = allResources.find(r => r.id === state.budActivity);
    if (resource) {
      const { assignments } = useResourceAssignmentStore.getState();
      const assignedBud = assignments[state.budActivity];

      if (assignedBud) {
        const { wholeAmount, newFraction } = calculateResourceGain(resource.gatherRate, deltaTime, state.fractionalResources[resource.id] || 0);
        const { wholeXP, newXPFraction } = calculateExperienceGain(resource.experienceGain, deltaTime, state.fractionalXP[assignedBud.id] || 0);

        useBankStore.getState().addResource(resource.id, wholeAmount);
        useHunterStore.getState().increaseBudExperience(assignedBud.id, wholeXP);

        return {
          ...state,
          fractionalResources: {
            ...state.fractionalResources,
            [resource.id]: newFraction,
          },
          fractionalXP: {
            ...state.fractionalXP,
            [assignedBud.id]: newXPFraction,
          },
        };
      }
    }
  }
  return state;
};