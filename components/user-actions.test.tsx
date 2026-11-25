import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, renderWithClient, userDetail, userRow } from "@/test/utils";
import { SupportView } from "./support-view";
import { UserActions } from "./user-actions";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const ID = "11111111-1111-4111-8111-111111111111";

describe("user actions", () => {
  it("offers what fits the user's state", () => {
    mockFetch({});
    const { unmount } = renderWithClient(<UserActions user={userRow({ suspended: true, emailVerified: true })} />);
    expect(screen.getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark verified" })).not.toBeInTheDocument();
    unmount();
    renderWithClient(<UserActions user={userRow()} />);
    expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend verification" })).toBeInTheDocument();
  });

  it("suspending needs a reason, which is sent with the request", async () => {
    const m = mockFetch({ [`POST /admin/users/${ID}/suspend`]: { data: userRow({ suspended: true }) } });
    renderWithClient(<UserActions user={userRow()} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Suspend" }));
    const confirm = screen.getAllByRole("button", { name: "Suspend" }).at(-1)!;
    expect(confirm).toBeDisabled();
    await u.type(screen.getByLabelText(/Reason/), "  chargeback fraud  ");
    await u.click(confirm);
    await waitFor(() => expect(m.last("POST", `/admin/users/${ID}/suspend`)!.body).toEqual({ reason: "chargeback fraud" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("deleting needs a reason AND the user's email typed out", async () => {
    const m = mockFetch({ [`DELETE /admin/users/${ID}`]: null });
    renderWithClient(<UserActions user={userRow()} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Delete…" }));
    const go = screen.getByRole("button", { name: "Delete permanently" });
    await u.type(screen.getByLabelText(/Reason/), "user asked by email");
    await u.type(screen.getByLabelText(/to confirm/), "pat@example.co");
    expect(go).toBeDisabled();
    await u.type(screen.getByLabelText(/to confirm/), "M");
    expect(go).toBeEnabled(); // case doesn't matter
    await u.click(go);
    await waitFor(() => expect(m.last("DELETE", `/admin/users/${ID}`)!.body).toEqual({ reason: "user asked by email", confirmEmail: "pat@example.com" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/users"));
  });
});

describe("support view", () => {
  it("while closed, loads no user data; opening asks for a reason", async () => {
    const m = mockFetch({ [`POST /admin/users/${ID}/support`]: { data: { userId: ID, expiresAt: new Date(Date.now() + 1800_000).toISOString() } }, [`GET /admin/users/${ID}`]: { data: userDetail() } });
    renderWithClient(<SupportView detail={userDetail()} />);
    expect(m.calls.some((c) => c.path.includes("/data/"))).toBe(false);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Open support view…" }));
    await u.type(screen.getByLabelText(/Reason/), "ticket 42: missing transfer");
    await u.click(screen.getByRole("button", { name: "Open support view" }));
    await waitFor(() => expect(m.last("POST", `/admin/users/${ID}/support`)!.body).toEqual({ reason: "ticket 42: missing transfer" }));
  });

  it("while open, shows the time left and each tab's rows with amounts in the row's currency", async () => {
    const m = mockFetch({
      [`GET /admin/users/${ID}/data/accounts`]: { data: { kind: "accounts", truncated: false, items: [{ id: "a1", userId: ID, name: "Wallet", currency: "JPY", balanceMinor: 1500 }] } },
      [`GET /admin/users/${ID}/data/notes`]: { data: { kind: "notes", truncated: true, items: [{ id: "n1", title: "Rent", body: "pay on 1st" }] } },
      [`DELETE /admin/users/${ID}/support`]: null,
      [`GET /admin/users/${ID}`]: { data: userDetail() },
    });
    renderWithClient(<SupportView detail={userDetail({ support: { open: true, expiresAt: new Date(Date.now() + 600_000).toISOString() } })} />);
    expect(screen.getByText(/open · (10:00|9:5\d) left/)).toBeInTheDocument();
    expect(await screen.findByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("¥1,500")).toBeInTheDocument(); // JPY has no minor unit
    expect(screen.queryByText("a1")).not.toBeInTheDocument(); // ids are hidden
    const u = userEvent.setup();
    await u.click(screen.getByRole("tab", { name: "Notes" }));
    expect(await screen.findByText("pay on 1st")).toBeInTheDocument();
    expect(screen.getByText(/Showing the latest 1/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Close support view" }));
    await waitFor(() => expect(m.last("DELETE", `/admin/users/${ID}/support`)).toBeDefined());
  });
});
