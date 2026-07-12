import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../wailsjs/go/dispatcher/Service", () => ({
    Dispatch: vi.fn().mockResolvedValue(undefined),
}));

import userEvent from "@testing-library/user-event";

import { Dispatch } from "../../wailsjs/go/dispatcher/Service";
import { Command } from "../models/command";
import Welcome from "./Welcome";

describe("Welcome", () => {
    it("renders the Create New Split File button", async () => {
        render(<Welcome />);

        const button = screen.getByRole("button", {
            name: /create new split file/i,
        });

        expect(button).toBeInTheDocument();
        await userEvent.click(button);
        expect(Dispatch).toHaveBeenCalledExactlyOnceWith(Command.NEW, null);
    });
});
