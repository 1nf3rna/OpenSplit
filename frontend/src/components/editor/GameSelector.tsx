import { useEffect, useMemo, useRef, useState } from "react";

import { SearchGames } from "../../../wailsjs/go/speedrun/Service";
import { useClickOutside } from "../../hooks/useClickOutside";
import { log } from "../../utils/logger";
import { GameMatch } from "./types";

type GameSelectorProps = {
    value: string;
    onChange: (value: string) => void;
    onSelect: (game: GameMatch) => void;
    onClearSelection: () => void;
};

export default function GameSelector({ value, onChange, onSelect, onClearSelection }: GameSelectorProps) {
    const [games, setGames] = useState<GameMatch[]>([]);
    const [active, setActive] = useState(false);

    const selectingGame = useRef(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    useClickOutside(autocompleteRef, () => setActive(false));

    useEffect(() => {
        if (selectingGame.current) {
            selectingGame.current = false;
            return;
        }

        const query = value.trim();

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
    }, [value]);

    const popupWidth = useMemo(() => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return 250;
        }

        ctx.font = getComputedStyle(document.body).font;

        return Math.max(150, ...games.map((g) => ctx.measureText(g.name).width + 10));
    }, [games]);

    return (
        <div className="row">
            <label htmlFor="game-name">Game Name</label>

            <div className="autocomplete" ref={autocompleteRef}>
                <input
                    id="game-name"
                    autoComplete="off"
                    value={value}
                    onFocus={() => setActive(true)}
                    onClick={() => setActive(true)}
                    onChange={(e) => {
                        onChange(e.target.value);
                        onClearSelection();
                    }}
                />

                {active && games.length > 0 && (
                    <ul
                        className="autocomplete-list"
                        style={{
                            width: `${Math.ceil(popupWidth)}px`,
                        }}
                    >
                        {games.map((game) => (
                            <li
                                key={game.id}
                                onMouseDown={() => {
                                    selectingGame.current = true;

                                    log.info("Selected gameID:", game.id);
                                    log.info("Selected game:", game.name);

                                    onChange(game.name);
                                    onSelect(game);

                                    setActive(false);
                                }}
                            >
                                {game.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
