import { ResourceNode } from "../types/resourceNode.types";

export const convertNodesToRecord = (nodes: ResourceNode[]): Record<string, ResourceNode> => {
  return nodes.reduce<Record<string, ResourceNode>>((acc, node) => {
    acc[node.id] = { ...node }; // Clone to avoid mutations
    return acc;
  }, {});
};