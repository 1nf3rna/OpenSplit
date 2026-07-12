/**
 * SplitEditor is used for both:
 *
 *  - creating new split files
 *  - editing existing split files
 *
 * It manages segment hierarchy editing, Speedrun.com metadata,
 * skins, timing information, and export.
 */

import React, { useEffect, useState } from "react";

import { Dispatch, ExportSplitFile } from "../../../wailsjs/go/dispatcher/Service";
import { GetAvailableSkins } from "../../../wailsjs/go/skin/Service";
import { Platforms, SearchCategories, SearchGames, SearchVariables } from "../../../wailsjs/go/speedrun/Service";
import { WindowCenter, WindowSetSize } from "../../../wailsjs/runtime";
import { useClickOutside } from "../../hooks/useClickOutside";
import { Command } from "../../models/command";
import SegmentPayload from "../../models/segmentPayload";
import SplitFilePayload from "../../models/splitFilePayload";
import { colorFromId, GroupCtx } from "./hashColor";
import SegmentRow from "./SegmentRow";
import {
    addChildRecursive,
    cloneSegments,
    deleteSegmentRecursive,
    groupIntoPreviousSibling,
    moveSegmentDown,
    moveSegmentUp,
    ungroupToTopLevel,
} from "./segmentTree";

type SplitEditorParams = {
    splitFilePayload: SplitFilePayload | null;
};

type RunningTotals = {
    avg: number;
    pb: number;
    gold: number;
};

type RenderResult = {
    rows: React.ReactElement[];
    totals: RunningTotals;
};

type GameMatch = {
    id: string;
    name: string;
    platforms: Platform[];
};

type Platform = {
    id: string;
    name: string;
};

type Category = {
    id: string;
    name: string;
};

type SelectedVariable = {
    name: string;
    value: string;
    label: string;
};

type Variable = {
    id: string;
    name: string;
    default?: string;
    options: {
        id: string;
        label: string;
    }[];
};

export default function SplitEditor({ splitFilePayload }: SplitEditorParams) {
    const editing = splitFilePayload != null;

    const [platform, setPlatform] = useState(splitFilePayload?.platform || "");
    const [platforms, setPlatforms] = useState<Platform[]>([]);

    const [gameName, setGameName] = useState(splitFilePayload?.game_name ?? "");
    const [gameID, setGameID] = useState(splitFilePayload?.speedrun_game_id ?? "");
    const [games, setGames] = useState<GameMatch[]>([]);

    const [categoryName, setCategoryName] = useState(splitFilePayload?.game_category ?? "");
    const [categoryID, setCategoryID] = useState(splitFilePayload?.speedrun_game_category_id ?? "");
    const [categories, setCategories] = useState<Category[]>([]);

    const [variables, setVariables] = useState<Variable[]>([]);
    const [selectedVariables, setSelectedVariables] = useState<Record<string, SelectedVariable>>({});

    const [attempts, setAttempts] = useState(splitFilePayload?.attempts ?? 0);

    const [segments, setSegments] = useState<SegmentPayload[]>(cloneSegments(splitFilePayload?.segments ?? []));

    const [offsetText, setOffsetText] = useState(String(splitFilePayload?.offset ?? 0));

    const [availableSkins, setAvailableSkins] = useState<string[]>([]);
    const [selectedSkin, setSelectedSkin] = useState(splitFilePayload?.selected_skin ?? "");

    const [showCumulativeTimes, setShowCumulativeTimes] = useState(false);
    const [gameActive, setGameActive] = useState(false);
    const [categoryActive, setCategoryActive] = useState(false);
    const selectingGame = React.useRef(false);

    useEffect(() => {
        if (selectingGame.current) {
            selectingGame.current = false;
            return;
        }

        const query = gameName.trim();

        const timeout = setTimeout(async () => {
            if (query.length === 0) {
                setGames([]);
                return;
            }

            const games = await SearchGames(query);

            setGames(
                games.data.map((g) => ({
                    id: g.id,
                    name: g.names.international,
                    platforms: g.platforms,
                })),
            );
        }, 200);

        return () => clearTimeout(timeout);
    }, [gameName]);

    useEffect(() => {
        console.log("gameID changed:", gameID);

        if (!gameID) {
            setCategories([]);
            return;
        }

        SearchCategories(gameID).then((result) => {
            console.log("categories", result);

            setCategories(result.data);
        });
    }, [gameID]);

    useEffect(() => {
        Platforms().then((p) => {
            setPlatforms(p);
        });
    }, []);

    useEffect(() => {
        const offset = splitFilePayload?.offset ?? 0;
        setOffsetText(String(offset));
    }, [splitFilePayload]);

    const gameAutocompleteRef = React.useRef<HTMLDivElement>(null);
    const categoryAutocompleteRef = React.useRef<HTMLDivElement>(null);

    useClickOutside(gameAutocompleteRef, () => setGameActive(false));
    useClickOutside(categoryAutocompleteRef, () => setCategoryActive(false));

    useEffect(() => {
        WindowSetSize(1000, 900);
        WindowCenter();

        console.debug("Loaded split editor", splitFilePayload?.id);

        setSegments(cloneSegments(splitFilePayload?.segments ?? []));
        setOffsetText(String(splitFilePayload?.offset ?? 0));

        const loadData = async () => {
            const [skinsResult, platformsResult] = await Promise.allSettled([GetAvailableSkins(), Platforms()]);

            if (skinsResult.status === "fulfilled") {
                setAvailableSkins(skinsResult.value);
            } else {
                console.error("Unable to load skins", skinsResult.reason);
            }

            if (platformsResult.status === "fulfilled") {
                setPlatforms(platformsResult.value);
            } else {
                console.error("Failed to load speedrun platforms", platformsResult.reason);
            }
        };

        void loadData();
    }, []);

    useEffect(() => {
        setSegments(cloneSegments(splitFilePayload?.segments ?? []));
        setOffsetText(String(splitFilePayload?.offset ?? 0));
    }, [splitFilePayload]);

    useEffect(() => {
        if (splitFilePayload?.selected_skin) {
            setSelectedSkin(splitFilePayload.selected_skin);
        } else if (availableSkins.length > 0) {
            setSelectedSkin(availableSkins[0]);
        }
    }, [splitFilePayload, availableSkins]);

    useEffect(() => {
        if (platforms.length === 0) return;

        const exists = platforms.some((p) => p.name === platform);

        if (!editing && !platform) {
            setPlatform(platforms[0].name);
            return;
        }

        if (!exists) {
            setPlatform(platforms[0].name);
        }
    }, [platforms, platform, editing]);

    useEffect(() => {
        if (selectingGame.current) {
            selectingGame.current = false;
            return;
        }

        const query = gameName.trim();

        const timeout = setTimeout(async () => {
            if (query.length === 0) {
                setGames([]);
                return;
            }

            const result = await SearchGames(query);

            setGames(
                result.data.map((g) => ({
                    id: g.id,
                    name: g.names.international,
                    platforms: g.platforms,
                })),
            );
        }, 200);

        return () => clearTimeout(timeout);
    }, [gameName]);

    useEffect(() => {
        if (!gameID) {
            setCategories([]);
            return;
        }

        const update = async () => {
            const [categories] = await Promise.all([SearchCategories(gameID)]);

            setCategories(categories.data);

            const match = games.find((g) => g.id === gameID);

            if (match?.platforms.length) {
                setPlatforms(match.platforms);
            } else {
                setPlatforms(await Platforms());
            }
        };

        void update();
    }, [gameID, games]);

    useEffect(() => {
        if (!categoryID) {
            setVariables([]);
            setSelectedVariables({});
            return;
        }

        SearchVariables(categoryID).then((result) => {
            setVariables(
                result.data.map((v) => ({
                    id: v.id,
                    name: v.name,
                    default: v.values.default,
                    options: Object.entries(v.values.values).map(([id, value]) => ({
                        id,
                        label: value.label,
                    })),
                })),
            );

            const values: Record<string, SelectedVariable> = {};

            (splitFilePayload?.variables ?? []).forEach((v) => {
                values[v.id] = {
                    name: v.name,
                    value: v.value,
                    label: v.label,
                };
            });

            result.data.forEach((v) => {
                if (!values[v.id]) {
                    values[v.id] = {
                        name: v.name,
                        value: "",
                        label: "",
                    };
                }
            });

            setSelectedVariables(values);
        });
    }, [categoryID]);

    const handleOffsetChange = (value: string) => {
        if (/^-?\d*$/.test(value)) {
            setOffsetText(value);
        }
    };

    const addSegment = (parent: SegmentPayload | null) => {
        if (parent === null) {
            setSegments((prev) => [...prev, new SegmentPayload()]);
        } else {
            setSegments((prev) => addChildRecursive(prev, parent));
        }
    };

    /**
     * Recursively updates a segment while preserving immutable state.
     */
    function updateSegment(id: string, updater: (segment: SegmentPayload) => SegmentPayload) {
        function recurse(list: SegmentPayload[]): SegmentPayload[] {
            return list.map((segment) =>
                segment.id === id
                    ? updater(segment)
                    : {
                          ...segment,
                          children: recurse(segment.children ?? []),
                      },
            );
        }

        setSegments((prev) => recurse(prev));
    }

    const deleteSegment = (id: string) => {
        setSegments((prev) => deleteSegmentRecursive(prev, id));
    };

    const emptyWR = {
        show: false,
        run_id: "",
        players: [],
        real_time: 0,
        in_game_time: 0,
    };

    /**
     * Builds a SplitFile payload and submits it to the backend.
     */
    const saveSplitFile = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const payload = SplitFilePayload.createFrom({
            id: splitFilePayload?.id ?? "",

            game_name: gameName,
            speedrun_game_id: gameID,

            game_category: categoryName,
            speedrun_game_category_id: categoryID,

            variables: Object.entries(selectedVariables).map(([id, v]) => ({
                id,
                name: v.name,
                value: v.value,
                label: v.label,
            })),

            version: splitFilePayload?.version ?? 0,

            selected_skin: selectedSkin,

            segments: segments,

            runs: splitFilePayload?.runs ?? [],
            pb: splitFilePayload?.pb ?? null,

            sob: splitFilePayload?.sob ?? 0,

            attempts: Number(attempts),

            offset: offsetText === "" || offsetText === "-" ? 0 : parseInt(offsetText, 10),

            platform: platform,

            wr: splitFilePayload?.wr ?? emptyWR,

            window_x: splitFilePayload?.window_x ?? 100,
            window_y: splitFilePayload?.window_y ?? 100,
            window_width: splitFilePayload?.window_width ?? 350,
            window_height: splitFilePayload?.window_height ?? 550,
        });

        console.debug("Saving split file", {
            id: payload.id,
            segments: payload.segments.length,
            variables: payload.variables,
            game: payload.game_name,
            category: payload.game_category,
        });

        await Dispatch(Command.SUBMIT, JSON.stringify(payload));
    };

    const longestGameWidth = React.useMemo(() => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return 250;

        ctx.font = getComputedStyle(document.body).font;

        return Math.max(150, ...games.map((m) => ctx.measureText(m.name).width + 10));
    }, [games]);

    const longestCategoryWidth = React.useMemo(() => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return 150;

        ctx.font = getComputedStyle(document.body).font;

        return Math.max(150, ...categories.map((c) => ctx.measureText(c.name).width + 10));
    }, [categories]);

    /**
     * Renders the segment hierarchy.
     *
     * Also computes cumulative timing values when enabled.
     */
    function renderRows(
        list: SegmentPayload[],
        depth: number,
        inheritedGroup: GroupCtx | null,
        isDirectChild: boolean,
        totals: RunningTotals,
    ): RenderResult {
        const rows: React.ReactElement[] = [];

        let running = { ...totals };

        for (let i = 0; i < list.length; i++) {
            const segment = list[i];

            const hasChildren = (segment.children ?? []).length > 0;

            const displayAverage = showCumulativeTimes ? running.avg + segment.average : segment.average;

            const displayPB = showCumulativeTimes ? running.pb + segment.pb : segment.pb;

            const displayGold = showCumulativeTimes ? running.gold + segment.gold : segment.gold;

            const child = hasChildren
                ? renderRows(segment.children ?? [], depth + 1, { bg: colorFromId(segment.id) }, true, running)
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
                    onDelete={deleteSegment}
                    onAddChild={addSegment}
                    onUpdate={updateSegment}
                ></SegmentRow>,
            );

            // Leaf segments contribute to running totals
            if (!hasChildren) {
                running = {
                    avg: running.avg + segment.average,
                    pb: running.pb + segment.pb,
                    gold: running.gold + segment.gold,
                };
            }

            if (child) {
                rows.push(...child.rows);
                running = child.totals;
            }
        }

        return {
            rows,
            totals: running,
        };
    }

    return (
        <div className="container form-container">
            <h2>{editing ? "Editing Split File" : "New Split File"}</h2>

            <form id="split-form" noValidate>
                <div className="row">
                    <label htmlFor="game_name">Game Name</label>

                    <div className="autocomplete" ref={gameAutocompleteRef}>
                        <input
                            value={gameName}
                            onFocus={() => setGameActive(true)}
                            onClick={() => setGameActive(true)}
                            onChange={(e) => {
                                setGameName(e.target.value);

                                // User is no longer using the selected speedrun.com game.
                                setGameID("");
                                setCategoryName("");
                                setCategoryID("");
                                setCategories([]);
                            }}
                            autoComplete="off"
                        />
                        {gameActive && games.length > 0 && (
                            <ul className="autocomplete-list" style={{ width: `${Math.ceil(longestGameWidth)}px` }}>
                                {games.map((game) => (
                                    <li
                                        key={game.id}
                                        onMouseDown={() => {
                                            selectingGame.current = true;
                                            console.log("Selected gameID: ", game.id);
                                            console.log("Selected game: ", game.name);
                                            setGameName(game.name);
                                            setGameID(game.id);

                                            if (game.platforms.length > 0) {
                                                setPlatforms(game.platforms);
                                            }

                                            setCategoryName("");
                                            setCategoryID("");

                                            setGameActive(false);
                                        }}
                                    >
                                        {game.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="row">
                    <label htmlFor="game_category">Category</label>

                    <div className="autocomplete" ref={categoryAutocompleteRef}>
                        <input
                            value={categoryName}
                            onFocus={() => setCategoryActive(true)}
                            onClick={() => setCategoryActive(true)}
                            onChange={(e) => setCategoryName(e.target.value)}
                            autoComplete="off"
                        />

                        {categoryActive && categories.length > 0 && (
                            <ul
                                className="autocomplete-list"
                                style={{
                                    width: `${Math.ceil(longestCategoryWidth)}px`,
                                }}
                            >
                                {categories.map((category) => (
                                    <li
                                        key={category.id}
                                        onMouseDown={() => {
                                            setCategoryName(category.name);
                                            setCategoryID(category.id);
                                            setCategoryActive(false);
                                        }}
                                    >
                                        {category.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {variables.length > 0 && (
                    <>
                        <label>Variables</label>

                        <div className="variable-row">
                            {variables.map((variable) => (
                                <div key={variable.id} className="variable">
                                    <label>{variable.name}</label>

                                    <select
                                        value={selectedVariables[variable.id]?.value ?? ""}
                                        // value={selectedVariables[variable.id] ?? ""}
                                        onChange={(e) => {
                                            const option = variable.options.find((o) => o.id === e.target.value);

                                            setSelectedVariables((prev) => ({
                                                ...prev,
                                                [variable.id]: {
                                                    name: variable.name,
                                                    value: e.target.value,
                                                    label: option?.label ?? "",
                                                },
                                            }));
                                        }}
                                    >
                                        <option value=""></option>

                                        {variable.options.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <div
                    className="row"
                    style={{
                        marginTop: 10,
                        marginBottom: 10,
                    }}
                >
                    <label htmlFor="platform">Platform</label>

                    <select
                        id="platform"
                        disabled={platforms.length === 0}
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        {platforms.length === 0 ? (
                            <option>Loading platforms...</option>
                        ) : (
                            platforms.map((platform) => (
                                <option key={platform.id} value={platform.name}>
                                    {platform.name}
                                </option>
                            ))
                        )}
                    </select>

                    <div className="row">
                        <label htmlFor="skin">Skin</label>

                        <select
                            id="skin"
                            style={{ marginLeft: 10 }}
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
                        id="runattempts"
                        name="attempts"
                        inputMode="numeric"
                        value={attempts}
                        onChange={(e) => setAttempts(Number(e.target.value))}
                    />
                </div>

                <div className="row">
                    <label htmlFor="offsetMS">Start Offset (milliseconds)</label>

                    <input
                        id="offsetMS"
                        name="offsetMS"
                        type="text"
                        autoComplete="off"
                        value={offsetText}
                        onChange={(e) => handleOffsetChange(e.target.value)}
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
                    <button type="button" onClick={() => addSegment(null)}>
                        Add Segment
                    </button>

                    <button type="button" onClick={() => setShowCumulativeTimes((v) => !v)}>
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

                                        <th
                                            style={{
                                                width: "12%",
                                            }}
                                        >
                                            Icon
                                        </th>

                                        <th
                                            style={{
                                                width: "45%",
                                            }}
                                        >
                                            Segment Name
                                        </th>

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

                                        <th
                                            style={{
                                                width: "5%",
                                            }}
                                        >
                                            Add
                                        </th>

                                        <th
                                            style={{
                                                width: "5%",
                                            }}
                                        />
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        renderRows(segments, 0, null, false, {
                                            avg: 0,
                                            pb: 0,
                                            gold: 0,
                                        }).rows
                                    }
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                <hr />

                <div
                    id="exporter"
                    style={{
                        display: editing ? "block" : "none",
                    }}
                >
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
                    <button className="primary" type="submit" onClick={saveSplitFile}>
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
