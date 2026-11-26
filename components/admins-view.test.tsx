import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockFetch, renderWithClient } from "@/test/utils";
import { AdminsView } from "./admins-view";
import { RequiredPasswordChange } from "./change-password";

const ME = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const me = (o: object = {}) => ({ data: { id: ME, email: "owner@example.com", name: "Owner", role: "owner", mustChangePassword: false, lastLoginAt: null, ...o } });
const account = (o: object = {}) => ({ id: B, email: "b@example.com", name: "Bea", role: "admin", twoFactorEnabled: true, mustChangePassword: false, lastLoginAt: null, disabledAt: null, createdAt: "2026-11-01T00:00:00.000Z", ...o });

describe("Admins page", () => {
  it("lists admins, hides actions on your own row, and adds an admin showing the one-time password once", async () => {
    const m = mockFetch({
      "GET /admin/me": me(),
      "GET /admin/admins": { data: [account({ id: ME, email: "owner@example.com", name: "Owner", role: "owner" }), account()] },
      "POST /admin/admins": { data: { admin: account({ id: "33333333-3333-4333-8333-333333333333", email: "new@example.com", name: "New", mustChangePassword: true, twoFactorEnabled: false }), temporaryPassword: "Xy7_one-time-pw0" } },
    });
    renderWithClient(<AdminsView />);
    expect(await screen.findByText("Bea")).toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Disable" })).toHaveLength(1); // only on Bea's row

    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Add admin" }));
    await u.type(screen.getByLabelText("Email"), "new@example.com");
    await u.type(screen.getByLabelText("Name"), "New");
    await u.type(screen.getByLabelText(/Reason/), "joining support");
    await u.click(screen.getAllByRole("button", { name: "Add admin" }).at(-1)!);
    expect(await screen.findByTestId("one-time-password")).toHaveTextContent("Xy7_one-time-pw0");
    expect(m.last("POST", "/admin/admins")!.body).toEqual({ email: "new@example.com", name: "New", role: "admin", reason: "joining support" });
    expect(screen.getByText(/won.t be shown again/)).toBeInTheDocument();
  });

  it("resetting a password needs a reason and shows the new one-time password", async () => {
    const m = mockFetch({
      "GET /admin/me": me(),
      "GET /admin/admins": { data: [account()] },
      [`POST /admin/admins/${B}/reset-password`]: { data: { admin: account({ mustChangePassword: true }), temporaryPassword: "New_temp_pw_1234" } },
    });
    renderWithClient(<AdminsView />);
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Reset password" }));
    const confirm = screen.getAllByRole("button", { name: "Reset password" }).at(-1)!;
    expect(confirm).toBeDisabled();
    await u.type(screen.getByLabelText(/Reason/), "forgot it");
    await u.click(confirm);
    expect(await screen.findByTestId("one-time-password")).toHaveTextContent("New_temp_pw_1234");
    expect(m.last("POST", `/admin/admins/${B}/reset-password`)!.body).toEqual({ reason: "forgot it" });
  });

  it("tells a regular admin the page is for owners, without asking the API for the list", async () => {
    const m = mockFetch({ "GET /admin/me": me({ role: "admin" }) });
    renderWithClient(<AdminsView />);
    expect(await screen.findByText("Only owners can manage admin accounts.")).toBeInTheDocument();
    expect(m.calls.some((c) => c.path === "/admin/admins")).toBe(false);
  });
});

describe("required password change", () => {
  it("only submits when the new password is long enough and typed twice", async () => {
    const m = mockFetch({ "POST /admin/me/password": null, "GET /admin/me": me() });
    renderWithClient(<RequiredPasswordChange name="Bea" onSignOut={() => undefined} />);
    const u = userEvent.setup();
    const submit = screen.getByRole("button", { name: "Set my password" });
    await u.type(screen.getByLabelText("One-time password"), "Xy7_one-time-pw0");
    const [next, again] = screen.getAllByLabelText(/^New password/);
    await u.type(next!, "a long new password");
    await u.type(again!, "a long new passwor");
    expect(screen.getByText(/don.t match/)).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await u.type(again!, "d");
    await u.click(submit);
    await waitFor(() => expect(m.last("POST", "/admin/me/password")!.body).toEqual({ currentPassword: "Xy7_one-time-pw0", newPassword: "a long new password" }));
  });
});
