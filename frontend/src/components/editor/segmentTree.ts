import SegmentPayload from "../../models/segmentPayload";

type ParentRef = {
    node: SegmentPayload;
    siblings: SegmentPayload[];
    index: number;
};

export function addChildRecursive(list: SegmentPayload[], parent: SegmentPayload): SegmentPayload[] {
    return list.map((item) => {
        if (item.id === parent.id) {
            const child = new SegmentPayload();

            return {
                ...item,
                children: [...(item.children ?? []), child],
            };
        }

        return {
            ...item,
            children: addChildRecursive(item.children ?? [], parent),
        };
    });
}

// Clone to safely do in-place operations on the copy
export function cloneSegments(list: SegmentPayload[]): SegmentPayload[] {
    return (list ?? []).map((seg) => {
        return new SegmentPayload({
            ...seg,
            children: cloneSegments(seg.children ?? []),
        });
    });
}

export function findNodeMutable(
    siblings: SegmentPayload[],
    id: string,
    parents: ParentRef[] = [],
): { siblings: SegmentPayload[]; index: number; parents: ParentRef[] } | null {
    for (let i = 0; i < siblings.length; i++) {
        const node = siblings[i];

        if (node.id === id) {
            return { siblings, index: i, parents };
        }

        const kids = node.children ?? [];

        if (kids.length > 0) {
            const nextParents = parents.concat([{ node, siblings, index: i }]);
            const found = findNodeMutable(kids, id, nextParents);

            if (found) {
                return found;
            }
        }
    }

    return null;
}

export function moveSegmentUp(list: SegmentPayload[], id: string): SegmentPayload[] {
    const root = cloneSegments(list);

    const found = findNodeMutable(root, id);
    if (!found) return list;

    const { siblings, index } = found;

    if (index <= 0) {
        return list;
    }

    [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]];

    return root;
}

export function moveSegmentDown(list: SegmentPayload[], id: string): SegmentPayload[] {
    const root = cloneSegments(list);

    const found = findNodeMutable(root, id);
    if (!found) return list;

    const { siblings, index } = found;

    if (index >= siblings.length - 1) {
        return list;
    }

    [siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]];

    return root;
}

export function groupIntoPreviousSibling(list: SegmentPayload[], id: string): SegmentPayload[] {
    const root = cloneSegments(list);

    const found = findNodeMutable(root, id);
    if (!found) {
        return list;
    }

    const { siblings, index } = found;

    if (index <= 0) {
        return list;
    }

    const node = siblings[index];
    const previous = siblings[index - 1];

    siblings.splice(index, 1);

    previous.children = [...(previous.children ?? []), node];

    return root;
}

export function ungroupToTopLevel(list: SegmentPayload[], id: string): SegmentPayload[] {
    const root = cloneSegments(list);

    const found = findNodeMutable(root, id);
    if (!found) {
        return list;
    }

    const { siblings, index, parents } = found;

    if (parents.length === 0) {
        return list;
    }
    const node = siblings[index];

    siblings.splice(index, 1);

    const topAncestor = parents[0].node;
    const topIndex = root.findIndex((s) => s.id === topAncestor.id);
    const insertAt = topIndex >= 0 ? topIndex + 1 : root.length;

    root.splice(insertAt, 0, node);

    return root;
}

export function deleteSegmentRecursive(list: SegmentPayload[], id: string): SegmentPayload[] {
    return list
        .filter((seg) => seg.id !== id)
        .map((seg) => ({
            ...seg,
            children: deleteSegmentRecursive(seg.children ?? [], id),
        }));
}
