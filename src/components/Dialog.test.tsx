// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, Dialog } from "./Dialog";

describe("Dialog (design §14.3)", () => {
  it("fokus awal, Tab/Shift+Tab terkunci, Esc & klik scrim menutup, fokus kembali ke pemicu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = render(
      <Dialog label="Uji" testid="x_dialog" onClose={onClose}>
        <button>A</button>
        <button>B</button>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();

    await user.keyboard("{Escape}");
    fireEvent.mouseDown(screen.getByTestId("x_dialog").parentElement!);
    fireEvent.mouseDown(screen.getByTestId("x_dialog")); // klik di dalam kotak tidak menutup
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("persistent: Esc & scrim tidak menutup; tanpa elemen fokus Tab tidak error", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog label="Uji" testid="x_dialog" persistent onClose={onClose}>
        <p>teks</p>
      </Dialog>,
    );
    await user.keyboard("{Escape}");
    await user.tab();
    fireEvent.mouseDown(screen.getByTestId("x_dialog").parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ConfirmDialog: fokus di Batal, tombol danger, konfirmasi & batal", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Keluar?" message="Yakin?" confirmLabel="Keluar" testid="x_confirm" danger onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("alertdialog", { name: "Keluar?" })).toBeInTheDocument();
    expect(screen.getByTestId("x_confirm_cancel")).toHaveFocus();
    await user.click(screen.getByTestId("x_confirm_confirm"));
    await user.click(screen.getByTestId("x_confirm_cancel"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
