import React from "react";

import SegmentPayload from "../../models/segmentPayload";
import SessionPayload from "../../models/sessionPayload";
import ActiveSegmentRow from "./ActiveSegmentRow";
import ParentSegmentRow from "./ParentSegmentRow";
import SegmentRow from "./SegmentRow";
import { CumulativeTimeDisplay, DeltaDisplay } from "./SegmentTime";
import { FlatSegment, isVisible, Targets } from "./segmentUtils";

type SegmentTreeProps = {
    sessionPayload: SessionPayload;
    flatSegments: FlatSegment[];
    targets: Targets;
    completeClassName: string;
    leafIndexById: Map<string, number>;
    parentById: Map<string, string | null>;
    expandedParents: Set<string>;
    lastLeafByParentId: Map<string, string>;
    leavesByParentId: Map<string, SegmentPayload[]>;
    finalLeafId: string | null;
    activeRowRef: React.RefObject<HTMLTableRowElement | null>;
    toggleParent: (id: string) => void;
};

export default function SegmentTree({
    sessionPayload,
    flatSegments,
    targets,
    completeClassName,
    leafIndexById,
    parentById,
    expandedParents,
    lastLeafByParentId,
    leavesByParentId,
    finalLeafId,
    activeRowRef,
    toggleParent,
}: SegmentTreeProps) {
    const mainRows: React.ReactNode[] = [];
    let finalRow: React.ReactNode | null = null;

    if (!sessionPayload.loaded_split_file || sessionPayload.leaf_segments == null) {
        return null;
    }

    for (const segmentData of flatSegments) {
        const segment = segmentData.Segment;

        const isFinalLeaf = finalLeafId != null && segment.id === finalLeafId;

        if (!isFinalLeaf && !isVisible(segment.id, parentById, expandedParents)) {
            continue;
        }

        const leafIndex = leafIndexById.get(segment.id);

        /*
         * Parent segment
         */
        if (leafIndex === undefined) {
            const isExpanded = expandedParents.has(segment.id);

            const lastLeafId = lastLeafByParentId.get(segment.id) ?? null;

            const lastLeafSplit = lastLeafId ? (sessionPayload.current_run?.splits[lastLeafId] ?? null) : null;

            let parentComparison: React.ReactNode = null;

            let parentDelta: React.ReactNode = null;

            let parentSegmentDelta: React.ReactNode = null;

            if (lastLeafId) {
                const cTarget = targets.cumulative[lastLeafId] ?? null;

                parentComparison = <CumulativeTimeDisplay split={lastLeafSplit} targetCumulative={cTarget} />;

                if (lastLeafSplit && cTarget != null) {
                    parentDelta = <DeltaDisplay delta={lastLeafSplit.current_cumulative - cTarget} />;
                }

                let actual = 0;
                let target = 0;
                let complete = true;

                for (const leaf of leavesByParentId.get(segment.id) ?? []) {
                    const split = sessionPayload.current_run?.splits[leaf.id];

                    if (!split) {
                        complete = false;
                        break;
                    }

                    actual += split.current_duration;
                    target += targets.individual[leaf.id] ?? 0;
                }

                if (complete) {
                    parentSegmentDelta = <DeltaDisplay delta={actual - target} />;
                }
            }

            const row = (
                <ParentSegmentRow
                    key={segment.id}
                    segment={segment}
                    depth={segmentData.Depth}
                    completeClassName={completeClassName}
                    isExpanded={isExpanded}
                    hasChildren={segmentData.HasChildren}
                    lastLeafSplit={lastLeafSplit}
                    parentComparison={parentComparison}
                    parentDelta={parentDelta}
                    parentSegmentDelta={parentSegmentDelta}
                    onToggle={() => toggleParent(segment.id)}
                />
            );

            mainRows.push(row);
            continue;
        }

        /*
         * Leaf segment
         */
        const selected = leafIndex === sessionPayload.current_segment_index;

        const cTarget = targets.cumulative[segment.id];

        const iTarget = targets.individual[segment.id];

        const split = sessionPayload.current_run?.splits[segment.id] ?? null;

        const previousActual =
            leafIndex === 0
                ? 0
                : (sessionPayload.current_run?.splits[sessionPayload.leaf_segments[leafIndex - 1].id]
                      ?.current_cumulative ?? 0);

        const row = selected ? (
            <ActiveSegmentRow
                key={segment.id}
                activeRowRef={activeRowRef}
                segmentData={segmentData}
                cTarget={cTarget}
                iTarget={iTarget}
                previousCumulative={previousActual}
            />
        ) : (
            <SegmentRow
                key={segment.id}
                segmentData={segmentData}
                split={split}
                cumulativeTarget={cTarget}
                individualTarget={iTarget}
            />
        );

        if (isFinalLeaf) {
            finalRow = row;
        } else {
            mainRows.push(row);
        }
    }

    return (
        <>
            <table cellSpacing="0" className={completeClassName}>
                <tbody>{mainRows}</tbody>
            </table>

            <div id="finalSegment" className={completeClassName}>
                <table className={completeClassName}>
                    <tbody>{finalRow}</tbody>
                </table>
            </div>
        </>
    );
}
// import React, { JSX } from "react";

// import SegmentPayload from "../../models/segmentPayload";
// import SessionPayload from "../../models/sessionPayload";
// import ActiveSegmentRow from "./ActiveSegmentRow";
// import ParentSegmentRow from "./ParentSegmentRow";
// import SegmentRow from "./SegmentRow";
// import { CumulativeTimeDisplay, DeltaDisplay } from "./SegmentTime";
// import { FlatSegment, isVisible, Targets } from "./segmentUtils";

// type SegmentTreeProps = {
//     sessionPayload: SessionPayload;
//     flatSegments: FlatSegment[];
//     targets: Targets;
//     completeClassName: string;
//     leafIndexById: Map<string, number>;
//     parentById: Map<string, string | null>;
//     expandedParents: Set<string>;
//     lastLeafByParentId: Map<string, string>;
//     leavesByParentId: Map<string, SegmentPayload[]>;
//     finalLeafId: string | null;
//     activeRowRef: React.RefObject<HTMLTableRowElement | null>;
//     toggleParent: (id: string) => void;
// };

// export default function SegmentTree({
//     sessionPayload,
//     flatSegments,
//     targets,
//     completeClassName,
//     leafIndexById,
//     parentById,
//     expandedParents,
//     lastLeafByParentId,
//     leavesByParentId,
//     finalLeafId,
//     activeRowRef,
//     toggleParent,
// }: SegmentTreeProps) {
//     const rows: JSX.Element[] = [];
//     let finalRow: JSX.Element | null = null;

//     if (!sessionPayload.loaded_split_file || sessionPayload.leaf_segments == null) {
//         return {
//             mainRows: rows,
//             finalRow,
//         };
//     }

//     for (const segmentData of flatSegments) {
//         const segment = segmentData.Segment;

//         const isFinalLeaf = finalLeafId != null && segment.id === finalLeafId;

//         if (!isFinalLeaf && !isVisible(segment.id, parentById, expandedParents)) {
//             continue;
//         }

//         const leafIndex = leafIndexById.get(segment.id);

//         /*
//          * Parent segment
//          */
//         if (leafIndex === undefined) {
//             const isExpanded = expandedParents.has(segment.id);

//             const lastLeafId = lastLeafByParentId.get(segment.id) ?? null;

//             const lastLeafSplit = lastLeafId ? (sessionPayload.current_run?.splits[lastLeafId] ?? null) : null;

//             let parentComparison: JSX.Element | null = null;
//             let parentDelta: JSX.Element | null = null;
//             let parentSegmentDelta: JSX.Element | null = null;

//             if (lastLeafId) {
//                 const cTarget = targets.cumulative[lastLeafId] ?? null;

//                 parentComparison = <CumulativeTimeDisplay split={lastLeafSplit} targetCumulative={cTarget} />;

//                 if (lastLeafSplit && cTarget != null) {
//                     parentDelta = <DeltaDisplay delta={lastLeafSplit.current_cumulative - cTarget} />;
//                 }

//                 let actual = 0;
//                 let target = 0;
//                 let complete = true;

//                 for (const leaf of leavesByParentId.get(segment.id) ?? []) {
//                     const split = sessionPayload.current_run?.splits[leaf.id];

//                     if (!split) {
//                         complete = false;
//                         break;
//                     }

//                     actual += split.current_duration;
//                     target += targets.individual[leaf.id] ?? 0;
//                 }

//                 if (complete) {
//                     parentSegmentDelta = <DeltaDisplay delta={actual - target} />;
//                 }
//             }

//             rows.push(
//                 <ParentSegmentRow
//                     key={segment.id}
//                     segment={segment}
//                     depth={segmentData.Depth}
//                     completeClassName={completeClassName}
//                     isExpanded={isExpanded}
//                     hasChildren={segmentData.HasChildren}
//                     lastLeafSplit={lastLeafSplit}
//                     parentComparison={parentComparison}
//                     parentDelta={parentDelta}
//                     parentSegmentDelta={parentSegmentDelta}
//                     onToggle={() => toggleParent(segment.id)}
//                 />,
//             );

//             continue;
//         }

//         /*
//          * Leaf segment
//          */
//         const selected = leafIndex === sessionPayload.current_segment_index;

//         const cTarget = targets.cumulative[segment.id];

//         const iTarget = targets.individual[segment.id];

//         const split = sessionPayload.current_run?.splits[segment.id] ?? null;

//         const previousActual =
//             leafIndex === 0
//                 ? 0
//                 : (sessionPayload.current_run?.splits[sessionPayload.leaf_segments![leafIndex - 1].id]
//                       ?.current_cumulative ?? 0);

//         const row = selected ? (
//             <ActiveSegmentRow
//                 key={segment.id}
//                 activeRowRef={activeRowRef}
//                 segmentData={segmentData}
//                 cTarget={cTarget}
//                 iTarget={iTarget}
//                 previousCumulative={previousActual}
//             />
//         ) : (
//             <SegmentRow
//                 key={segment.id}
//                 segmentData={segmentData}
//                 split={split}
//                 cumulativeTarget={cTarget}
//                 individualTarget={iTarget}
//             />
//         );

//         if (isFinalLeaf) {
//             finalRow = row;
//         } else {
//             rows.push(row);
//         }
//     }

//     return {
//         mainRows: rows,
//         finalRow,
//     };
// }
