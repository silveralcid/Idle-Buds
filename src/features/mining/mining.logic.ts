import { useMiningStore } from "./mining.store";

/**
 * Start mining on a node.
 */

export const startMining = (nodeId: string): void => {
  const { nodes, level, currentNode, setCurrentNode } = useMiningStore.getState();
  const node = nodes[nodeId];

  // Validation
  if (!node) {
    console.warn(`Node with ID "${nodeId}" does not exist.`);
    return;
  }
  if (!node.isUnlocked) {
    console.warn(`Node "${node.name}" is locked.`);
    return;
  }
  if (level < node.levelRequired) {
    console.warn(`Level ${node.levelRequired} required to mine "${node.name}".`);
    return;
  }

  // Stop mining the current node if it's different from the new one
  if (currentNode && currentNode !== nodeId) {
    console.log(`Switching from node "${currentNode}" to "${nodeId}".`);
    stopMining();
  }

  // Set the new current node
  setCurrentNode(nodeId);
  console.log(`Started mining "${node.name}".`);
};


/**
 * Process mining tick (progress and rewards).
 */
export const processMiningTick = (deltaTime: number): void => {
    const { currentNode, nodes, ores, setOres, setXp, xp, level, setLevel, setNodes, xpToNextLevel } =
      useMiningStore.getState();
  
    if (!currentNode) return;
  
    const node = nodes[currentNode];
    if (!node) return;
  
    // Simulate mining progress
    const progress = node.gatherRate * deltaTime;
    const newOres: Record<string, number> = { ...ores };
  
    // Collect resources for the current node
    node.resourceNodeYields.forEach((ore) => {
      newOres[ore] = (newOres[ore] || 0) + progress; // Update quantities of mined ores
    });
  
    // Update node health immutably
    const updatedNode = { ...node, nodeHealth: Math.max(0, node.nodeHealth - progress) };
  
    // Update nodes immutably in the store
    setNodes({ ...nodes, [currentNode]: updatedNode });
  
    // Update ores globally (flat structure)
    setOres(newOres);
  
    // Award XP
    const xpGain = node.experienceGain * deltaTime;
    const newXp = xp + xpGain;
    setXp(newXp);
  
    // Handle level-up
    const requiredXp = xpToNextLevel();
    if (newXp >= requiredXp) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setXp(newXp - requiredXp); // Carry over excess XP
      console.log(`Congratulations! Reached level ${newLevel}.`);
    }
  
    console.log(`Mined ${progress} from "${node.name}", gained ${xpGain} XP.`);
  
    // Handle depletion and regeneration
    if (updatedNode.nodeHealth <= 0) {
      console.log(`${node.name} is depleted!`);
      if (node.isRenewable) {
        setTimeout(() => {
          const regeneratedNode = { ...updatedNode, nodeHealth: node.maxHealth };
          setNodes({ ...nodes, [currentNode]: regeneratedNode });
          console.log(`${node.name} has regenerated.`);
        }, node.regenRate * 1000);
      }
    }
  };
  
  
  

/**
 * Stop mining action.
 */
export const stopMining = (): void => {
    const { currentNode, setCurrentNode, setNodes, nodes } = useMiningStore.getState();
  
    if (currentNode) {
      const node = nodes[currentNode];
      if (node) {
        console.log(`Stopping mining on node: "${node.name}"`);
        // Optionally reset node state if needed
        const updatedNode = { ...node };
        setNodes({ ...nodes, [currentNode]: updatedNode });
      }
    }
  
    // Clear the current node
    setCurrentNode(null);
    console.log("Mining has been stopped.");
  };
  