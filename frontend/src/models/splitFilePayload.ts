import RunPayload from "./runPayload";
import SegmentPayload from "./segmentPayload";

export default class SplitFilePayload {
    id: string = "";
    game_name: string = "";
    game_category: string = "";
    version: number = 1;

    selected_skin?: string;

    segments: SegmentPayload[] = [];
    runs: RunPayload[] = [];
    pb: RunPayload | null = null;

    sob: number = 0;
    attempts: number = 0;
    offset: number = 0;
    platform: string = "SNES";

    window_x: number = 100;
    window_y: number = 100;
    window_height: number = 550;
    window_width: number = 350;

    constructor(init?: Partial<SplitFilePayload>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    static createFrom = (source: Partial<SplitFilePayload>): SplitFilePayload => {
        return new SplitFilePayload(source);
    };
}
