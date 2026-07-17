import React, { useEffect, useState } from "react";

import { EventsOn } from "../../../wailsjs/runtime";
import SegmentRow from "./SegmentRow";
import { FlatSegment } from "./segmentUtils";

type ActiveSegmentRowProps = {
    segmentData: FlatSegment;
    cTarget: number;
    iTarget: number;
    previousCumulative: number;
    activeRowRef: React.RefObject<HTMLTableRowElement | null>;
};

/**
 * ActiveSegmentRow subscribes to timer updates so only the active
 * segment rerenders during a run instead of the entire segment table.
 */
export default function ActiveSegmentRow({
    segmentData,
    cTarget,
    iTarget,
    previousCumulative,
    activeRowRef,
}: ActiveSegmentRowProps) {
    const [time, setTime] = useState(0);

    useEffect(() => {
        return EventsOn("timer:update", (value: number) => {
            setTime(value);
        });
    }, []);

    return (
        <SegmentRow
            segmentData={segmentData}
            split={null}
            cumulativeTarget={cTarget}
            individualTarget={iTarget}
            activeRow
            time={time}
            previousCumulative={previousCumulative}
            activeRowRef={activeRowRef}
        />
    );
}
