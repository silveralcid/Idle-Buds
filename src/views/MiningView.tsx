import React from "react";
import { useViewStore } from "../core/view.state";
import MiningNode from "../features/mining/components/MiningNode";
import { useMiningStore } from "../features/mining/mining.state";

const MiningView: React.FC = () => {
  const setView = useViewStore((state) => state.setView);
  const nodes = useMiningStore((state) => state.nodes); // Access all nodes from the mining state

  const goBack = () => {
    setView("DefaultView"); // Example for switching views
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mining View</h1>
      <p>Click on a node to start mining!</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(nodes).map((node) => (
          <MiningNode key={node.id} nodeId={node.id} />
        ))}
      </div>
      <button className="btn btn-primary mt-4" onClick={goBack}>
        Go Back
      </button>
    </div>
  );
};

export default MiningView;
