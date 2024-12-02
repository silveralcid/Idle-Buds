import { ResourceNode } from "../../types/resourceNode.types";
import { create } from "zustand";
import { useBankStore } from "../bank/bank.state";
import { convertNodesToRecord } from "../../utils/nodes-to-record";
import { miningNodes } from "../../data/nodes/mining.data";
import { BaseSkill } from "../../types/base-skill.types";
import { calculateXpToNextLevel } from "../../utils/experience";

export interface MiningState extends BaseSkill {
    activeNode: string | null;
    nodes: Record<string, ResourceNode>;
    ores: Record<string, number>;
    setXp: (xp: number) => void;
    setLevel: (level: number) => void;
    setProgress: (progress: number) => void;
    xpToNextLevel: () => number;
    setactiveNode: (nodeId: string | null) => void;
    setOres: (newOres: Record<string, number>) => void;
    setNodes: (nodes: Record<string, ResourceNode>) => void; // Add this
    reset: () => void;
  }
  

  export const useMiningStore = create<MiningState>((set, get) => ({
    id: "mining",
    name: "Mining",
    description: "Extract valuable ores from the earth.",
    xp: 0,
    level: 1,
    progress: 0,
    isUnlocked: true,
    unlockRequirements: undefined,
    activeNode: null,
    nodes: convertNodesToRecord(miningNodes),
    ores: {},
    setXp: (xp: number) => set(() => ({ xp })),
    setLevel: (level: number) => {
      set((state) => {
        const updatedNodes = { ...state.nodes };
  
        // Unlock nodes based on the new level
        Object.keys(updatedNodes).forEach((nodeId) => {
          const node = updatedNodes[nodeId];
          if (!node.isUnlocked && level >= node.levelRequired) {
            updatedNodes[nodeId] = { ...node, isUnlocked: true };
            console.log(`Unlocked node: ${node.name}`);
          }
        });
  
        return { level, nodes: updatedNodes };
      });
    },
    setProgress: (progress: number) => set(() => ({ progress })),
    setactiveNode: (nodeId: string | null) =>
      set(() => {
        console.log("Setting activeNode:", nodeId);
        return { activeNode: nodeId };
      }),
      setOres: (newOres: Record<string, number>) =>
        set((state) => {
          const bankStore = useBankStore.getState();
      
          // Only update the bank with ores being mined currently
          Object.entries(newOres).forEach(([ore, quantity]) => {
            if (state.activeNode && state.activeNode in state.ores) {
              bankStore.addItem(ore, quantity - (state.ores[ore] || 0)); // Add only the difference
            } else {
              bankStore.addItem(ore, quantity); // Add all if no current ore entry
            }
          });
      
          return { ores: { ...state.ores, ...newOres } }; // Merge with current ores
        }),
      
    setNodes: (nodes: Record<string, ResourceNode>) => set(() => ({ nodes })),
    reset: () =>
      set(() => ({
        xp: 0,
        level: 1,
        progress: 0,
        activeNode: null,
        nodes: convertNodesToRecord(miningNodes),
        ores: {},
      })),
    xpToNextLevel: () => calculateXpToNextLevel(get().level), // Derived value
  }));
  
  