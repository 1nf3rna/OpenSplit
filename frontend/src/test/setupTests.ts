import "@testing-library/jest-dom"

import { vi } from "vitest"

vi.mock("../../wailsjs/runtime/runtime", () => ({
    EventsOn: vi.fn(),
    EventsOff: vi.fn(),
    EventsEmit: vi.fn(),
    WindowSetTitle: vi.fn(),
    WindowSetSize: vi.fn(),
}))
