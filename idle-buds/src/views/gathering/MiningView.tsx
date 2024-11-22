import React from 'react';
import ResourceCard from '../../components/game/ResourceCard';
import { useGameStore } from '../../stores/game.store';
import { useHunterStore } from '../../stores/hunter.store';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useNodeAssignmentStore } from '../../stores/nodeAssignment.store';
import { allResources } from '../../data/allResources.data';

const MiningView = () => {
  useGameLoop();

  const startGathering = useGameStore((state) => state.startGathering);
  const miningSkill = useHunterStore((state) => state.skills.mining);
  const { assignments, assignBudToNode, removeBudFromNode } = useNodeAssignmentStore();

  const handleActivate = (resourceId: string) => {
    const currentActivity = useGameStore.getState().currentActivity;
    if (currentActivity !== resourceId) {
      console.log(`Activating gathering for resource: ${resourceId}`);
      startGathering(resourceId, false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mining</h2>
          <p className="text-sm opacity-70">
            Level: {miningSkill.level} | XP: {miningSkill.experience}/{miningSkill.experienceToNextLevel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow overflow-auto">
        {allResources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            assignedBuds={assignments[resource.id] || []}
            onAssignBud={(bud) => assignBudToNode(resource.id, bud)}
            onRemoveBud={(budId) => removeBudFromNode(resource.id, budId)}
            onActivate={handleActivate}
            skillId="mining"
          />
        ))}
      </div>
    </div>
  );
};

export default MiningView;