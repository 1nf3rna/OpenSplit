import { useMemo, useRef, useState } from "react";

import { useClickOutside } from "../../hooks/useClickOutside";
import { Category } from "./types";

type CategorySelectorProps = {
    value: string;
    categories: Category[];
    onChange: (value: string) => void;
    onSelect: (category: Category) => void;
};

export default function CategorySelector({ value, categories, onChange, onSelect }: CategorySelectorProps) {
    const [active, setActive] = useState(false);

    const autocompleteRef = useRef<HTMLDivElement>(null);

    useClickOutside(autocompleteRef, () => setActive(false));

    const popupWidth = useMemo(() => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return 150;
        }

        ctx.font = getComputedStyle(document.body).font;

        return Math.max(150, ...categories.map((c) => ctx.measureText(c.name).width + 10));
    }, [categories]);

    return (
        <div className="row">
            <label htmlFor="game-category">Category</label>

            <div className="autocomplete" ref={autocompleteRef}>
                <input
                    id="game-category"
                    autoComplete="off"
                    value={value}
                    onFocus={() => setActive(true)}
                    onClick={() => setActive(true)}
                    onChange={(e) => onChange(e.target.value)}
                />

                {active && categories.length > 0 && (
                    <ul
                        className="autocomplete-list"
                        style={{
                            width: `${Math.ceil(popupWidth)}px`,
                        }}
                    >
                        {categories.map((category) => (
                            <li
                                key={category.id}
                                onMouseDown={() => {
                                    onChange(category.name);
                                    onSelect(category);
                                    setActive(false);
                                }}
                            >
                                {category.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
