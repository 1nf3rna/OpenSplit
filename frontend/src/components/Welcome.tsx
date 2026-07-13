import { Dispatch } from "../../wailsjs/go/dispatcher/Service";
import { WindowSetSize } from "../../wailsjs/runtime";
import zdgLogo from "../assets/images/ZG512.png";
import { Command } from "../models/command";

export default function Welcome() {
    WindowSetSize(320, 580);
    return (
        <div className="welcome">
            <img src={zdgLogo} alt="" />
            <hr />
            <h3>OpenSplit</h3>
            <button
                onClick={async () => {
                    await Dispatch(Command.NEW, null);
                }}
            >
                Create New Split File
            </button>
            <button
                onClick={async () => {
                    await Dispatch(Command.LOAD, null);
                }}
            >
                Load Split File
            </button>
            <button
                onClick={async () => {
                    await Dispatch(Command.EDIT, null);
                }}
            >
                OpenSplit Settings
            </button>

            <button
                className="welcome-exit"
                onClick={async () => {
                    await Dispatch(Command.QUIT, null);
                }}
            >
                Exit OpenSplit
            </button>

            <div className="welcome-footer">
                <p>Copyright ZellyDev LLC - ZellyDev Games {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}
