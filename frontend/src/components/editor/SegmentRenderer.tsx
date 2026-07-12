import React from "react";

import SegmentPayload from "../../models/segmentPayload";
import { colorFromId, GroupCtx } from "./hashColor";
import SegmentRow from "./SegmentRow";
import { groupIntoPreviousSibling, moveSegmentDown, moveSegmentUp, ungroupToTopLevel } from "./segmentTree";
import { RenderResult, RunningTotals, SegmentUpdater } from "./types";

type RenderSegmentRowsProps = {
    segments: SegmentPayload[];
    depth?: number;
    inheritedGroup?: GroupCtx | null;
    isDirectChild?: boolean;

    totals?: RunningTotals;

    showCumulativeTimes: boolean;

    setSegments: React.Dispatch<React.SetStateAction<SegmentPayload[]>>;

    onDelete: (id: string) => void;
    onAddChild: (parent: SegmentPayload | null) => void;
    onUpdate: SegmentUpdater;
};

export function renderSegmentRows({
    segments,
    depth = 0,
    inheritedGroup = null,
    isDirectChild = false,
    totals = {
        avg: 0,
        pb: 0,
        gold: 0,
    },

    showCumulativeTimes,

    setSegments,

    onDelete,
    onAddChild,
    onUpdate,
}: RenderSegmentRowsProps): RenderResult {
    const rows: React.ReactElement[] = [];

    let running = { ...totals };

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        const children = segment.children ?? [];

        const hasChildren = children.length > 0;

        const displayAverage = showCumulativeTimes ? running.avg + segment.average : segment.average;

        const displayPB = showCumulativeTimes ? running.pb + segment.pb : segment.pb;

        const displayGold = showCumulativeTimes ? running.gold + segment.gold : segment.gold;

        const childResult = hasChildren
            ? renderSegmentRows({
                  segments: children,
                  depth: depth + 1,
                  inheritedGroup: {
                      bg: colorFromId(segment.id),
                  },
                  isDirectChild: true,
                  totals: running,

                  showCumulativeTimes,

                  setSegments,

                  onDelete,
                  onAddChild,
                  onUpdate,
              })
            : null;

        rows.push(
            <SegmentRow
                key={segment.id}
                segment={segment}
                depth={depth}
                index={i}
                inheritedGroup={inheritedGroup}
                isDirectChild={isDirectChild}
                displayAverage={displayAverage}
                displayPB={displayPB}
                displayGold={displayGold}
                onMoveUp={(id) => setSegments((prev) => moveSegmentUp(prev, id))}
                onMoveDown={(id) => setSegments((prev) => moveSegmentDown(prev, id))}
                onGroup={(id) => setSegments((prev) => groupIntoPreviousSibling(prev, id))}
                onUngroup={(id) => setSegments((prev) => ungroupToTopLevel(prev, id))}
                onDelete={onDelete}
                onAddChild={onAddChild}
                onUpdate={onUpdate}
            />,
        );

        if (!hasChildren) {
            running = {
                avg: running.avg + segment.average,
                pb: running.pb + segment.pb,
                gold: running.gold + segment.gold,
            };
        }

        if (childResult) {
            rows.push(...childResult.rows);
            running = childResult.totals;
        }
    }

    return {
        rows,
        totals: running,
    };
}
