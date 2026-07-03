import { forwardRef, RefObject, useImperativeHandle, useRef } from "react";

import { msToParts, partsToMS } from "../splitter/Timer";

type TimeRowParams = {
    time: number | null;
    onChange?: (ms: number) => void;
};

type Handle = {
    getMillis(): number;
};

export const TimeRow = forwardRef<Handle, TimeRowParams>((props, ref) => {
    const hourRef: RefObject<HTMLInputElement | null> = useRef(null);
    const minuteRef: RefObject<HTMLInputElement | null> = useRef(null);
    const secondRef: RefObject<HTMLInputElement | null> = useRef(null);
    const centiRef: RefObject<HTMLInputElement | null> = useRef(null);

    const emit = () => {
        if (!props.onChange) return;

        props.onChange(
            partsToMS({
                negative: false,
                hours: parseInt(hourRef.current?.value || "0", 10),
                minutes: parseInt(minuteRef.current?.value || "0", 10),
                seconds: parseInt(secondRef.current?.value || "0", 10),
                centis: parseInt(centiRef.current?.value || "0", 10),
            }),
        );
    };

    useImperativeHandle(ref, () => ({
        getMillis: () => {
            return partsToMS({
                negative: false,
                hours: parseInt(hourRef.current?.value ?? "0", 10),
                minutes: parseInt(minuteRef.current?.value ?? "0", 10),
                seconds: parseInt(secondRef.current?.value ?? "0", 10),
                centis: parseInt(centiRef.current?.value ?? "0", 10),
            });
        },
    }));

    return (
        <div className="segment-time">
            <input
                ref={hourRef}
                placeholder="H"
                defaultValue={props.time != null ? msToParts(props.time).hours : ""}
                onChange={emit}
            />
            <span>:</span>
            <input
                ref={minuteRef}
                placeholder="MM"
                defaultValue={props.time != null ? msToParts(props.time).minutes : ""}
                onChange={emit}
            />
            <span>:</span>
            <input
                ref={secondRef}
                placeholder="SS"
                defaultValue={props.time != null ? msToParts(props.time).seconds : ""}
                onChange={emit}
            />
            <span>.</span>
            <input
                ref={centiRef}
                placeholder={"cc"}
                defaultValue={props.time != null ? msToParts(props.time).centis : ""}
                onChange={emit}
            />
        </div>
    );
});
