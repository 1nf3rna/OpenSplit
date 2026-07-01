import {
    faArrowDown,
    faArrowRightFromBracket,
    faArrowUp,
    faArrowUpFromBracket,
    faFolder,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useState } from "react";

import { Dispatch, ExportSplitFile } from "../../../wailsjs/go/dispatcher/Service";
import { GetAvailableSkins } from "../../../wailsjs/go/skin/Service";
import { WindowCenter, WindowSetSize } from "../../../wailsjs/runtime";
import { Command } from "../../App";
import SegmentPayload from "../../models/segmentPayload";
import SplitFilePayload from "../../models/splitFilePayload";
import { IconButton } from "../Tooltip";
import { colorFromId, GroupCtx } from "./hashColor";
import { TimeRow } from "./TimeRow";

type SplitEditorParams = {
    splitFilePayload: SplitFilePayload | null;
    speedRunAPIBase: string;
};

function addChildRecursive(list: SegmentPayload[], parent: SegmentPayload): SegmentPayload[] {
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
function cloneSegments(list: SegmentPayload[]): SegmentPayload[] {
    return (list ?? []).map((seg) => {
        return new SegmentPayload({
            ...seg,
            children: cloneSegments(seg.children ?? []),
        });
    });
}

type ParentRef = { node: SegmentPayload; siblings: SegmentPayload[]; index: number };

function findNodeMutable(
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
            if (found) return found;
        }
    }
    return null;
}

export default function SplitEditor({ splitFilePayload }: SplitEditorParams) {
    // Is this a new file or are we editing?
    const editing = splitFilePayload != null;

    const [platform, setPlatform] = React.useState<string>(splitFilePayload?.platform ?? "SNES");
    const [gameName, setGameName] = React.useState<string>(splitFilePayload?.game_name ?? "");
    const [gameCategory, setGameCategory] = React.useState<string>(splitFilePayload?.game_category ?? "");
    const [attempts, setAttempts] = React.useState<number>(splitFilePayload?.attempts ?? 0);
    const [segments, setSegments] = useState<SegmentPayload[]>(splitFilePayload?.segments ?? []);
    const [offsetMS, setOffsetMS] = useState(splitFilePayload?.offset ?? 0);
    const [offsetText, setOffsetText] = useState(String(splitFilePayload?.offset ?? 0));
    const [availableSkins, setAvailableSkins] = useState<string[]>([]);
    const [selectedSkin, setSelectedSkin] = useState(splitFilePayload?.selected_skin ?? "");
    const [showCumulativeTimes, setShowCumulativeTimes] = useState(false);

    useEffect(() => {
        setOffsetText(String(splitFilePayload?.offset ?? 0));
    }, [splitFilePayload]);

    const handleOffsetChange = (v: string) => {
        // Allow empty string, "-" and any integer being typed
        if (/^-?\d*$/.test(v)) {
            setOffsetText(v);
        }
    };

    useEffect(() => {
        setOffsetMS(splitFilePayload?.offset ?? 0);
    }, [splitFilePayload]);

    useEffect(() => {
        GetAvailableSkins().then((skins) => {
            setAvailableSkins(skins);

            if (splitFilePayload?.selected_skin) {
                setSelectedSkin(splitFilePayload.selected_skin);
            } else if (skins.length > 0) {
                setSelectedSkin(skins[0]);
            }
        });
    }, [splitFilePayload]);

    useEffect(() => {
        console.log("SplitEditor payload", JSON.stringify(splitFilePayload, null, 2));
        console.log("offsetMS state", offsetMS);
    }, [splitFilePayload]);

    // Position and size the edit window
    useEffect(() => {
        WindowSetSize(1000, 900);
        WindowCenter();
    }, []);

    const addSegment = (parent: SegmentPayload | null) => {
        if (parent === null) {
            // top-level segment
            setSegments((prev) => [...prev, new SegmentPayload()]);
        } else {
            // subsegment
            setSegments((prev) => addChildRecursive(prev, parent));
        }
    };

    function updateSegmentName(id: string, name: string) {
        function updateRecursive(list: SegmentPayload[]): SegmentPayload[] {
            return list.map((item) => {
                if (item.id === id) {
                    return { ...item, name };
                }

                if ((item.children ?? []).length > 0) {
                    return {
                        ...item,
                        children: updateRecursive(item.children ?? []),
                    };
                }

                return item;
            });
        }

        setSegments((prev) => updateRecursive(prev));
    }

    const deleteSegment = (id: string) => {
        function deleteRecursive(list: SegmentPayload[]): SegmentPayload[] {
            return list
                .filter((seg) => seg.id !== id) // remove the target
                .map((seg) => ({
                    ...seg,
                    children: deleteRecursive(seg.children ?? []), // recurse downward
                }));
        }

        setSegments((prev) => deleteRecursive(prev));
    };

    const saveSplitFile = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const newSplitFilePayload = SplitFilePayload.createFrom({
            id: splitFilePayload?.id ?? "",
            game_name: gameName,
            game_category: gameCategory,
            version: splitFilePayload?.version ?? 0,

            selected_skin: selectedSkin,

            segments: segments,
            runs: splitFilePayload?.runs ?? [],
            pb: splitFilePayload?.pb ?? null,

            sob: splitFilePayload?.sob ?? 0,
            attempts: Number(attempts),
            offset: offsetText === "" || offsetText === "-" ? 0 : parseInt(offsetText, 10),
            platform: platform,

            window_x: splitFilePayload?.window_x ?? 100,
            window_y: splitFilePayload?.window_y ?? 100,
            window_height: splitFilePayload?.window_height ?? 550,
            window_width: splitFilePayload?.window_width ?? 350,
        });

        const payload = JSON.stringify(newSplitFilePayload);
        await Dispatch(Command.SUBMIT, payload);
    };

    const moveSegmentUp = (id: string) => {
        setSegments((prev) => {
            const root = cloneSegments(prev);
            const found = findNodeMutable(root, id);
            if (!found) return prev;

            const { siblings, index } = found;
            if (index <= 0) return prev;

            const tmp = siblings[index - 1];
            siblings[index - 1] = siblings[index];
            siblings[index] = tmp;

            return root;
        });
    };

    const moveSegmentDown = (id: string) => {
        setSegments((prev) => {
            const root = cloneSegments(prev);
            const found = findNodeMutable(root, id);
            if (!found) return prev;

            const { siblings, index } = found;
            if (index >= siblings.length - 1) return prev;

            const tmp = siblings[index + 1];
            siblings[index + 1] = siblings[index];
            siblings[index] = tmp;

            return root;
        });
    };

    const groupIntoPreviousSibling = (id: string) => {
        setSegments((prev) => {
            const root = cloneSegments(prev);
            const found = findNodeMutable(root, id);
            if (!found) return prev;

            const { siblings, index } = found;
            if (index <= 0) return prev;

            const node = siblings[index];
            const prevNode = siblings[index - 1];

            siblings.splice(index, 1);

            const prevChildren = prevNode.children ?? [];
            prevNode.children = [...prevChildren, node];

            return root;
        });
    };

    const ungroupToTopLevel = (id: string) => {
        setSegments((prev) => {
            const root = cloneSegments(prev);
            const found = findNodeMutable(root, id);
            if (!found) return prev;

            const { siblings, index, parents } = found;
            if (parents.length === 0) return prev;

            const node = siblings[index];
            siblings.splice(index, 1);

            const topAncestor = parents[0].node;
            const topIndex = root.findIndex((s) => s.id === topAncestor.id);
            const insertAt = topIndex >= 0 ? topIndex + 1 : root.length;

            root.splice(insertAt, 0, node);

            return root;
        });
    };

    function updateSegmentTimes(id: string, average: number, pb: number) {
        function update(list: SegmentPayload[]): SegmentPayload[] {
            return list.map((seg) => {
                if (seg.id === id) {
                    return {
                        ...seg,
                        average,
                        pb,
                    };
                }

                return {
                    ...seg,
                    children: update(seg.children ?? []),
                };
            });
        }

        setSegments((prev) => update(prev));
    }

    /**
     * renderRows arguments:
     * - depth: indent depth
     * - inheritedGroupShade: shading applied because this row is a direct child of a grouped parent
     */
    function renderRows(
        list: SegmentPayload[],
        depth: number,
        inheritedGroup: GroupCtx | null,
        isDirectChild: boolean,
        totalAvg: number,
        totalPB: number,
    ): {
        rows: React.ReactElement[];
        totalAvg: number;
        totalPB: number;
    } {
        const rows: React.ReactElement[] = [];

        for (let i = 0; i < list.length; i++) {
            const segment = list[i];
            const hasChildren = (segment.children ?? []).length > 0;

            // If THIS row is a group parent, it defines a new group color for itself + its direct children
            const ownGroup: GroupCtx | null = hasChildren ? { bg: colorFromId(segment.id) } : null;

            // Row styling:
            // - Group parent row: use its own group color
            // - Direct children of a group parent: use inherited group color
            // - Otherwise: no group styling
            const rowGroup: GroupCtx | null = ownGroup ?? (isDirectChild ? inheritedGroup : null);

            const rowStyle: React.CSSProperties | undefined = rowGroup
                ? ({ ["--group-bg"]: rowGroup.bg } as React.CSSProperties)
                : undefined;

            const inGroup = !!rowGroup;
            const isGroupParentRow = !!ownGroup;
            const isGroupChildRow = !ownGroup && isDirectChild && !!inheritedGroup;

            const rowClassName = [
                inGroup ? "seg-group" : "",
                isGroupParentRow ? "seg-group-parent" : "",
                isGroupChildRow ? "seg-group-child" : "",
            ]
                .filter(Boolean)
                .join(" ");

            const displayAverage = showCumulativeTimes ? totalAvg + segment.average : segment.average;

            const displayPB = showCumulativeTimes ? totalPB + segment.pb : segment.pb;

            rows.push(
                <React.Fragment key={segment.id}>
                    <tr className={rowClassName} style={rowStyle}>
                        <td>
                            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <IconButton
                                    icon={faArrowUp}
                                    tooltip="Move segment up"
                                    onClick={() => moveSegmentUp(segment.id)}
                                />
                                <IconButton
                                    icon={faArrowDown}
                                    tooltip="Move segment down"
                                    onClick={() => moveSegmentDown(segment.id)}
                                />
                                <IconButton
                                    icon={faArrowUpFromBracket}
                                    tooltip="Group under the segment above"
                                    show={i !== 0}
                                    onClick={() => groupIntoPreviousSibling(segment.id)}
                                />
                                <IconButton
                                    icon={faArrowRightFromBracket}
                                    tooltip="Remove from group (move to top level)"
                                    show={depth > 0}
                                    onClick={() => ungroupToTopLevel(segment.id)}
                                />
                            </div>
                        </td>

                        <td style={{ paddingLeft: depth * 20 }}>
                            <input
                                value={segment.name}
                                onChange={(e) => updateSegmentName(segment.id, e.target.value)}
                            />
                        </td>

                        <td>
                            {!hasChildren && (
                                <TimeRow
                                    time={displayAverage}
                                    onChange={(newAverage) => {
                                        updateSegmentTimes(
                                            segment.id,
                                            showCumulativeTimes ? newAverage - totalAvg : newAverage,
                                            segment.pb,
                                        );
                                    }}
                                />
                            )}
                        </td>

                        <td>
                            {!hasChildren && (
                                <TimeRow
                                    time={displayPB}
                                    onChange={(newPB) => {
                                        updateSegmentTimes(
                                            segment.id,
                                            segment.average,
                                            showCumulativeTimes ? newPB - totalPB : newPB,
                                        );
                                    }}
                                />
                            )}
                        </td>

                        <td>
                            <IconButton icon={faFolder} tooltip="Add subsegment" onClick={() => addSegment(segment)} />
                        </td>

                        <td>
                            <IconButton
                                icon={faTrash}
                                tooltip="Delete segment"
                                onClick={() => deleteSegment(segment.id)}
                            />
                        </td>
                    </tr>
                </React.Fragment>,
            );

            // Leaf segments contribute to running totals
            if (!hasChildren) {
                totalAvg += segment.average;
                totalPB += segment.pb;
            }

            // Children continue from current totals instead of restarting
            if (hasChildren) {
                const childResult = renderRows(segment.children, depth + 1, ownGroup, true, totalAvg, totalPB);

                rows.push(...childResult.rows);

                totalAvg = childResult.totalAvg;
                totalPB = childResult.totalPB;
            }
        }

        return {
            rows,
            totalAvg,
            totalPB,
        };
    }

    return (
        <div className="container form-container">
            <h2>{editing ? "Editing Split File" : "New Split File"}</h2>
            <form id="split-form" noValidate>
                <div className="row">
                    <label htmlFor="game_name">Game Name</label>
                    <input
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        id="game_name"
                        name="game_name"
                        type="text"
                        autoComplete="off"
                    />
                </div>

                <div className="row">
                    <label htmlFor="game_category">Category</label>
                    <input
                        onChange={(e) => setGameCategory(e.target.value)}
                        id="game_category"
                        name="game_category"
                        type="text"
                        autoComplete="off"
                        value={gameCategory}
                    />
                </div>

                <div className="row" style={{ marginTop: 10, marginBottom: 10 }}>
                    <label htmlFor="platform">Platform</label>
                    <select
                        style={{ marginLeft: 10 }}
                        id="platform"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        <option value={"NES"}>NES</option>
                        <option value={"SNES"}>SNES</option>
                        <option value={"Nintendo64"}>Nintendo 64</option>
                        <option value={"GameCube"}>GameCube</option>
                        <option value={"Wii"}>Wii</option>
                        <option value={"WiiU"}>Wii U</option>
                        <option value={"Switch"}>Nintendo Switch</option>

                        <option value={"MegaDrive"}>Mega Drive</option>
                        <option value={"Genesis"}>Sega Genesis</option>
                        <option value={"SegaCD"}>Sega CD</option>
                        <option value={"32X"}>Sega 32X</option>
                        <option value={"Saturn"}>Sega Saturn</option>
                        <option value={"Dreamcast"}>Dreamcast</option>

                        <option value={"PlayStation"}>PlayStation</option>
                        <option value={"PS2"}>PlayStation 2</option>
                        <option value={"PS3"}>PlayStation 3</option>
                        <option value={"PS4"}>PlayStation 4</option>
                        <option value={"PS5"}>PlayStation 5</option>

                        <option value={"Xbox"}>Xbox</option>
                        <option value={"Xbox360"}>Xbox 360</option>
                        <option value={"XboxOne"}>Xbox One</option>
                        <option value={"XboxSeries"}>Xbox Series X|S</option>

                        <option value={"PC"}>PC</option>
                        <option value={"Mac"}>Mac</option>
                        <option value={"Linux"}>Linux</option>

                        {/* Handhelds */}

                        <option value={"GameBoy"}>Game Boy</option>
                        <option value={"GameBoyColor"}>Game Boy Color</option>
                        <option value={"GameBoyAdvance"}>Game Boy Advance</option>
                        <option value={"NintendoDS"}>Nintendo DS</option>
                        <option value={"Nintendo3DS"}>Nintendo 3DS</option>
                        <option value={"SwitchLite"}>Switch Lite</option>

                        <option value={"GameGear"}>Game Gear</option>
                        <option value={"NeoGeoPocket"}>Neo Geo Pocket</option>

                        <option value={"PSP"}>PlayStation Portable (PSP)</option>
                        <option value={"PSVita"}>PlayStation Vita</option>

                        <option value={"iOS"}>iOS</option>
                        <option value={"Android"}>Android</option>
                    </select>
                    <div className="row">
                        <label htmlFor="skin">Skin</label>

                        <select
                            style={{ marginLeft: 10 }}
                            id="skin"
                            value={selectedSkin}
                            onChange={(e) => setSelectedSkin(e.target.value)}
                        >
                            {availableSkins.map((skin) => (
                                <option key={skin} value={skin}>
                                    {skin}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row">
                    <label htmlFor="runattempts">Attempts</label>
                    <input
                        onChange={(e) => setAttempts(Number(e.target.value))}
                        value={attempts ?? 0}
                        id="runattempts"
                        name="attempts"
                        inputMode="numeric"
                    />
                </div>

                <div className="row">
                    <label htmlFor="offset">Start Offset (milliseconds)</label>
                    <input
                        onChange={(e) => handleOffsetChange(e.target.value)}
                        id="offsetMS"
                        name="offsetMS"
                        type="text"
                        autoComplete="off"
                        value={offsetText}
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 20,
                        marginBottom: 20,
                    }}
                >
                    <button onClick={() => addSegment(null)} type="button">
                        Add Segment
                    </button>

                    <button type="button" onClick={() => setShowCumulativeTimes((v) => !v)}>
                        {showCumulativeTimes ? "Cumulative Times" : "Segment Times"}
                    </button>
                </div>

                <div className="datagrid-container">
                    <div className="datagrid">
                        {segments && segments.length > 0 && (
                            <table cellSpacing={0} className="datagrid" id="tbl-segments">
                                <thead>
                                    <tr>
                                        <th style={{ width: "5%" }}>#</th>
                                        <th style={{ width: "50%" }}>Segment Name</th>
                                        <th>
                                            Average Time <small>(HH:MM:SS.ccc)</small>
                                        </th>
                                        <th>
                                            Personal Best <small>(HH:MM:SS.ccc)</small>
                                        </th>
                                        <th style={{ width: "5%" }}>Add Subsegment</th>
                                        <th style={{ width: "5%" }}></th>
                                    </tr>
                                </thead>
                                <tbody>{renderRows(segments, 0, null, false, 0, 0).rows}</tbody>
                            </table>
                        )}
                    </div>
                </div>

                <hr />

                <div id="expoter" style={{ display: editing ? "block" : "none" }}>
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            await ExportSplitFile(platform);
                        }}
                    >
                        Export Splitfile
                    </button>
                </div>

                <div className="actions">
                    <button onClick={saveSplitFile} type="submit" className="primary">
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            await Dispatch(Command.CANCEL, null);
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
