import { useEffect, useState } from "react";

import { Dispatch, OpenSkinsFolder, OpenSplitFileFolder } from "../../wailsjs/go/dispatcher/Service";
import { GetAvailableSkins, SetSkin } from "../../wailsjs/go/skin/Service";
import { EventsOn, WindowSetSize } from "../../wailsjs/runtime";
import { Command } from "../models/command";
import { ConfigPayload, KeyInfo } from "../models/configPayload";

export type ConfigParams = {
    configPayload: ConfigPayload;
};

const RECORDING_ARMED = 10;
const DEFAULT_ROLLING_AVG = 20;

export default function Config({ configPayload }: ConfigParams) {
    const [recording, setRecording] = useState(false);
    const [config, setConfig] = useState<ConfigPayload>(configPayload);
    const [availableSkins, setAvailableSkins] = useState<Array<string>>([]);
    const [selectedSkin, setSelectedSkin] = useState<string>(configPayload.selected_skin);
    const [rollingAvg, setRollingAvg] = useState<number>(configPayload.rolling_average_runs ?? DEFAULT_ROLLING_AVG);

    useEffect(() => {
        setRollingAvg(config.rolling_average_runs ?? DEFAULT_ROLLING_AVG);
    }, [config]);

    useEffect(() => {
        (async () => {
            await SetSkin(selectedSkin, true);
        })();
    }, [selectedSkin]);

    useEffect(() => {
        (async () => {
            const as = await GetAvailableSkins();
            console.log(as);
            setAvailableSkins(as);
        })();
    }, []);

    useEffect(() => {
        WindowSetSize(700, 800);
        return EventsOn("config:update", (newConfigPayload: ConfigPayload) => {
            console.log("received update from backend", newConfigPayload);
            setConfig(newConfigPayload);
            setRecording(false);
        });
    }, []);

    const armHotkey = async (command: Command) => {
        const reply = await Dispatch(command, null);
        if (reply.code == RECORDING_ARMED) {
            console.log("backend confirms recording is armed");
            setRecording(true);
        }
    };

    const getHotkeyName = (ki?: KeyInfo): string => {
        if (!ki) {
            return "No Hotkey Assigned";
        }

        const modifiers = ki.modifier_locale_names?.length > 0 ? ki.modifier_locale_names.join(" + ") + " + " : "";

        const key = ki.locale_name ?? "";

        const ret = modifiers + key;

        return ret.trim() === "" ? "No Hotkey Assigned" : ret;
    };

    const displayHotkeyRows = () => {
        const commands: [Command, string][] = [
            [Command.SPLIT, "Split"],
            [Command.UNDO, "Undo Split"],
            [Command.SKIP, "Skip Split"],
            [Command.PAUSE, "Pause Run"],
            [Command.RESET, "Reset Run"],
            [Command.COMPARISON_LEFT, "Previous Comparison"],
            [Command.COMPARISON_RIGHT, "Next Comparison"],
        ];

        return commands.map((command: [Command, string]) => (
            <div className="row" key={command[0]}>
                <div className="hotkeyContainer">
                    <p className="hotkeyID">{command[1]}: </p>
                    <p className="hotkeyValue">{getHotkeyName(config.key_config?.[command[0]])}</p>
                    <button disabled={recording} onClick={() => armHotkey(command[0])}>
                        {(recording && "Recording") || "Record Hotkey"}
                    </button>
                </div>
            </div>
        ));
    };

    return (
        <div className="container form-container options-container">
            <h2>OpenSplit Configuration</h2>
            <div id="options">
                <h3>Hotkeys</h3>
                {displayHotkeyRows()}
            </div>

            <hr />

            <div id="skins" style={{ marginBottom: 20 }}>
                <h3>Active Skin</h3>
                <select
                    style={{ marginLeft: 20, width: "50%" }}
                    id="selectedSkin"
                    value={selectedSkin}
                    onChange={(e) => setSelectedSkin(e.target.value)}
                >
                    {availableSkins.map((s) => (
                        <option value={s} key={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            <hr />

            <div id="rollingAvg">
                <h3>Rolling Average Window</h3>

                <select
                    value={rollingAvg}
                    onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRollingAvg(v);
                        setConfig({
                            ...config,
                            rolling_average_runs: v,
                        });
                    }}
                >
                    {[5, 10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                            Last {n} Runs
                        </option>
                    ))}
                </select>
            </div>

            <hr />

            <div id="directories">
                <h3>Directories</h3>
                <button onClick={OpenSplitFileFolder}>Open Splitfile Folder</button>
                <button onClick={OpenSkinsFolder}>Open Skins Folder</button>
            </div>

            <hr />

            <div className="actions">
                <button onClick={() => Dispatch(Command.SUBMIT, JSON.stringify(config))}>Save</button>
                <button onClick={() => Dispatch(Command.CANCEL, null)}>Cancel</button>
            </div>
        </div>
    );
}
