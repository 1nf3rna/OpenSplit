import React, { useEffect } from "react";

import { Dispatch } from "../wailsjs/go/dispatcher/Service";
import { GetSkinAddress } from "../wailsjs/go/skin/Service";
import { EventsEmit, EventsOn, WindowGetPosition, WindowGetSize } from "../wailsjs/runtime";
import Config from "./components/Config";
import SplitEditor from "./components/editor/SplitEditor";
import Splitter from "./components/splitter/Splitter";
import Welcome from "./components/Welcome";
import { Command } from "./models/command";
import { ConfigPayload } from "./models/configPayload";
import SessionPayload from "./models/sessionPayload";
import SplitFilePayload from "./models/splitFilePayload";
import { log } from "./utils/logger";

export enum AppView {
    Welcome = "welcome",
    NewSplitFile = "new-split-file",
    EditSplitFile = "edit-split-file",
    Running = "running",
    Settings = "settings",
}

export type AppViewModel =
    | { view: AppView.Welcome }
    | {
          view: AppView.NewSplitFile;
          splitFile?: SplitFilePayload | null;
      }
    | { view: AppView.EditSplitFile; splitFile: SplitFilePayload | null }
    | { view: AppView.Running; session: SessionPayload; config: ConfigPayload }
    | { view: AppView.Settings; config: ConfigPayload };

type ViewRouterProps = { model: AppViewModel };

function ViewRouter({ model }: ViewRouterProps) {
    switch (model.view) {
        case AppView.Welcome:
            return <Welcome />;

        case AppView.NewSplitFile:
            return <SplitEditor splitFilePayload={model.splitFile ?? null} />;

        case AppView.EditSplitFile:
            return <SplitEditor splitFilePayload={model.splitFile} />;

        case AppView.Running:
            return <Splitter sessionPayload={model.session} configPayload={model.config} />;

        case AppView.Settings:
            return <Config configPayload={model.config} />;
    }
}

/**
 * Root application component.
 *
 * Initializes global event bindings, skin loading, window tracking,
 * and routes between the various application views.
 */
export default function App() {
    const [viewModel, setViewModel] = React.useState<AppViewModel>({ view: AppView.Welcome });
    useDetectWindowChange();
    useAppEventBindings(setViewModel);
    useWindowFocus();

    useEffect(() => {
        // get the initial skin
        log.info("[App] Loading initial skin");
        GetSkinAddress().then((a) => changeSkin(a));

        // subscribe to future updates
        return EventsOn("skin:update", (address: string) => {
            log.info("[App] Skin updated:", address);
            changeSkin(address);
        });
    }, []);

    return (
        <div id="App" className="app">
            <ViewRouter model={viewModel} />
        </div>
    );
}

function changeSkin(address: string) {
    let link = document.getElementById("skin-css") as HTMLLinkElement | null;

    if (!link) {
        link = document.createElement("link");
        link.id = "skin-css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }
    link.href = address;
    console.log("changed skin to ", link.href);
}

function useDetectWindowChange() {
    useEffect(() => {
        let lastX = 0;
        let lastY = 0;
        let lastH = 0;
        let lastW = 0;
        let init = false;

        (async () => {
            const { x, y } = await WindowGetPosition();
            lastX = x;
            lastY = y;

            const { w, h } = await WindowGetSize();
            lastW = w;
            lastH = h;
            init = true;
        })();

        const interval = window.setInterval(async () => {
            if (!init) return;
            const { x, y } = await WindowGetPosition();
            const { w, h } = await WindowGetSize();

            if (x != lastX || y != lastY || h != lastH || w != lastW) {
                console.debug("[App] Window position changed", { x, y, w, h });
                lastX = x;
                lastY = y;
                lastW = w;
                lastH = h;

                EventsEmit("window:dimensions", x, y, w, h);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);
}

function useAppEventBindings(setViewModel: React.Dispatch<React.SetStateAction<AppViewModel>>) {
    useEffect(() => {
        const unsubViewModel = EventsOn("ui:model", (nextModel: AppViewModel) => {
            log.info("[App] UI switched to", nextModel.view);
            setViewModel(nextModel);
        });

        const unsubSession = EventsOn("session:update", (updatedSession: SessionPayload) => {
            setViewModel((prev) => {
                if (prev.view === AppView.Running) {
                    return {
                        ...prev,
                        session: updatedSession,
                    };
                }
                return prev;
            });
        });

        return () => {
            unsubViewModel();
            unsubSession();
        };
    }, [setViewModel]);
}

function useWindowFocus() {
    const f = async () => {
        log.debug("[App] Window focused");
        await Dispatch(Command.FOCUS, "true");
    };

    const uf = async () => {
        log.debug("[App] Window lost focus");
        await Dispatch(Command.FOCUS, "false");
    };

    useEffect(() => {
        (async () => {
            window.addEventListener("focus", f);
            window.addEventListener("blur", uf);
        })();

        return () => {
            window.removeEventListener("focus", f);
            window.removeEventListener("blur", uf);
        };
    }, []);
}
