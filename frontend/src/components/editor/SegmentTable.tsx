import React from "react";

import SegmentPayload from "../../models/segmentPayload";
import { renderSegmentRows } from "./SegmentRenderer";
import { SegmentUpdater } from "./types";

type SegmentTableProps = {
    segments: SegmentPayload[];

    setSegments: React.Dispatch<React.SetStateAction<SegmentPayload[]>>;

    showCumulativeTimes: boolean;
    setShowCumulativeTimes: React.Dispatch<React.SetStateAction<boolean>>;

    onAddSegment: (parent: SegmentPayload | null) => void;
    onDeleteSegment: (id: string) => void;
    onUpdateSegment: SegmentUpdater;
};

export default function SegmentTable({
    segments,
    setSegments,
    showCumulativeTimes,
    setShowCumulativeTimes,
    onAddSegment,
    onDeleteSegment,
    onUpdateSegment,
}: SegmentTableProps) {
    return (
        <>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 20,
                    marginBottom: 20,
                }}
            >
                <button type="button" onClick={() => onAddSegment(null)}>
                    Add Segment
                </button>

                <button type="button" onClick={() => setShowCumulativeTimes((value) => !value)}>
                    {showCumulativeTimes ? "Show Segment Times" : "Show Cumulative Times"}
                </button>
            </div>

            <div className="datagrid-container">
                <div className="datagrid">
                    {segments.length > 0 && (
                        <table id="tbl-segments" className="datagrid" cellSpacing={0}>
                            <thead>
                                <tr>
                                    <th style={{ width: "5%" }}>#</th>

                                    <th style={{ width: "12%" }}>Icon</th>

                                    <th style={{ width: "45%" }}>Segment Name</th>

                                    <th>
                                        Average Time
                                        <small>(HH:MM:SS.ccc)</small>
                                    </th>

                                    <th>
                                        Personal Best
                                        <small>(HH:MM:SS.ccc)</small>
                                    </th>

                                    <th>
                                        Gold
                                        <small>(HH:MM:SS.ccc)</small>
                                    </th>

                                    <th style={{ width: "5%" }}>Add</th>

                                    <th style={{ width: "5%" }} />
                                </tr>
                            </thead>

                            <tbody>
                                {
                                    renderSegmentRows({
                                        segments,

                                        showCumulativeTimes,

                                        setSegments,

                                        onDelete: onDeleteSegment,
                                        onAddChild: onAddSegment,
                                        onUpdate: onUpdateSegment,
                                    }).rows
                                }
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
