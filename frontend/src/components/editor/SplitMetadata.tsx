import { Dispatch, SetStateAction } from "react";

import { Platform } from "./types";

type SplitMetadataProps = {
    platform: string;
    setPlatform: Dispatch<SetStateAction<string>>;
    platforms: Platform[];

    selectedSkin: string;
    setSelectedSkin: Dispatch<SetStateAction<string>>;
    availableSkins: string[];

    attempts: number;
    setAttempts: Dispatch<SetStateAction<number>>;

    offsetText: string;
    onOffsetChange: (value: string) => void;
};

export default function SplitMetadata({
    platform,
    setPlatform,
    platforms,
    selectedSkin,
    setSelectedSkin,
    availableSkins,
    attempts,
    setAttempts,
    offsetText,
    onOffsetChange,
}: SplitMetadataProps) {
    return (
        <>
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
                    onChange={(e) => onOffsetChange(e.target.value)}
                />
            </div>
        </>
    );
}
