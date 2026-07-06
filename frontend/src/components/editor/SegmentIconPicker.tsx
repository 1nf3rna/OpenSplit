import React from "react";

import addIcon from "../../assets/images/add.png";
import removeIcon from "../../assets/images/remove.png";

type SegmentIconPickerProps = {
    icon: string;
    onChange: (icon: string) => void;
};

const iconStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    cursor: "pointer",
    border: "1px solid #666",
    borderRadius: 2,
    padding: 2,
    boxSizing: "border-box",
};

const previewStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    objectFit: "contain",
    border: "1px solid #666",
    borderRadius: 2,
    cursor: "pointer",
};

export default function SegmentIconPicker({ icon, onChange }: SegmentIconPickerProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            onChange(reader.result as string);
        };

        reader.readAsDataURL(file);

        e.target.value = "";
    };

    return (
        <>
            <input ref={inputRef} hidden type="file" accept="image/*" onChange={handleUpload} />

            {!icon ? (
                <img src={addIcon} alt="" style={iconStyle} onClick={() => inputRef.current?.click()} />
            ) : (
                <>
                    <img src={icon} alt="" style={previewStyle} onClick={() => inputRef.current?.click()} />

                    <img src={removeIcon} alt="" style={iconStyle} onClick={() => onChange("")} />
                </>
            )}
        </>
    );
}
