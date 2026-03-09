import type { EntityNode } from '../types';

export const filterEntityTree = (nodes: EntityNode[], allowedIds: Set<string>, directIds: Set<string>, directlyDiscarded?: Set<string>): EntityNode[] => {
    const result: EntityNode[] = [];
    for (const node of nodes) {
        if (allowedIds.has(node.id)) {
            const children = node.isGroup ? filterEntityTree(node.children, allowedIds, directIds, directlyDiscarded) : [];
            // A group node is only kept if it's a direct match or has children in the filtered set.
            if (node.isGroup && children.length === 0 && !directIds.has(node.id)) {
                continue;
            }
            result.push({ ...node, children });
        } else if (node.isGroup) {
            // A discarded group node is kept if it has children that need to be shown.
            const children = filterEntityTree(node.children, allowedIds, directIds, directlyDiscarded);
            if (children.length > 0) {
                const isSelfDiscarded = directlyDiscarded?.has(node.id) ?? false;
                result.push({ ...node, children, isDimmed: !isSelfDiscarded });
            }
        }
    }
    return result;
};
