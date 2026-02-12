import {msToParts, numeric, partsToMS, TimeParts} from "../splitter/Timer";
import {forwardRef, RefObject, useImperativeHandle, useRef} from "react";

type timeRowParams = {
    time: number | null;
};

type Handle = {
    getMillis(): number;
};

export const TimeRow = forwardRef<Handle, timeRowParams>(
    (props, ref) => {
    const hourRef: RefObject<HTMLInputElement | null> = useRef(null)
    const minuteRef: RefObject<HTMLInputElement | null> = useRef(null)
    const secondRef: RefObject<HTMLInputElement | null> = useRef(null)
    const centiRef: RefObject<HTMLInputElement | null> = useRef(null)

    useImperativeHandle(ref, () => ({
        getMillis: () => {
            return partsToMS({
                negative: false,
                hours: parseInt(hourRef.current?.value ?? "0", 10),
                minutes: parseInt(minuteRef.current?.value ?? "0", 10),
                seconds: parseInt(secondRef.current?.value ?? "0", 10),
                centis: parseInt(centiRef.current?.value ?? "0", 10),
            })
        }
     }))

    return (
        <div className="segment-time">
            <input
                ref={hourRef}
                placeholder="H"
                defaultValue={props.time != null ? msToParts(props.time).hours : ""}
            />
            <span>:</span>
            <input
                ref={minuteRef}
                placeholder="MM"
                defaultValue={props.time != null ? msToParts(props.time).minutes : ""}
            />
            <span>:</span>
            <input
                ref={secondRef}
                placeholder="SS"
                defaultValue={props.time != null ? msToParts(props.time).seconds : ""}
            />
            <span>.</span>
            <input
                ref={centiRef}
                placeholder={"cc"}
                defaultValue={props.time != null ? msToParts(props.time).centis : ""}
            />
        </div>
    );
});
