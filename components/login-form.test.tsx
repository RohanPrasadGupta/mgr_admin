import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { errorResponse, mockFetch } from "@/test/utils";
import { LoginForm } from "./login-form";

vi.mock("next/image", () => ({ default: (p: { alt: string }) => <span>{p.alt}</span> }));

async function enterPassword() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Email"), "ops@example.com");
  await u.type(screen.getByLabelText("Password"), "correct horse battery");
  await u.click(screen.getByRole("button", { name: "Continue" }));
  return u;
}

describe("admin sign-in", () => {
  it("first sign-in: shows the enrolment key (grouped) and a QR, then sends only the code", async () => {
    const m = mockFetch({
      "POST /auth/login": { data: { step: "setup", secret: "JBSWY3DPEHPK3PXP", otpauthUrl: "otpauth://totp/MoneyMgr%20Admin:ops?secret=JBSWY3DPEHPK3PXP" } },
      "POST /auth/mfa": { data: { admin: { id: "a", email: "ops@example.com", name: "Ops", lastLoginAt: null } } },
    });
    const onSignedIn = vi.fn();
    render(<LoginForm onSignedIn={onSignedIn} />);
    const u = await enterPassword();
    expect(await screen.findByText("Set up two-factor sign-in")).toBeInTheDocument();
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(m.last("POST", "/auth/login")!.body).toEqual({ email: "ops@example.com", password: "correct horse battery" });

    const submit = screen.getByRole("button", { name: "Turn on and sign in" });
    await u.type(screen.getByLabelText("Code"), "12a34");
    expect(submit).toBeDisabled(); // digits only, and exactly six
    await u.type(screen.getByLabelText("Code"), "56");
    await u.click(submit);
    expect(m.last("POST", "/auth/mfa")!.body).toEqual({ code: "123456" }); // the 2FA token lives in a cookie, not in the page
    expect(onSignedIn).toHaveBeenCalled();
  });

  it("shows the API's message for a wrong password and stays on the password step", async () => {
    mockFetch({ "POST /auth/login": () => errorResponse(401, "invalid_credentials", "Invalid email or password") });
    render(<LoginForm onSignedIn={vi.fn()} />);
    await enterPassword();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("a wrong code keeps the 2FA step; an expired 2FA step goes back to the password", async () => {
    let n = 0;
    mockFetch({
      "POST /auth/login": { data: { step: "mfa" } },
      "POST /auth/mfa": () => (++n === 1 ? errorResponse(400, "invalid_code", "That code isn't right") : errorResponse(401, "unauthorized", "expired")),
    });
    render(<LoginForm onSignedIn={vi.fn()} />);
    const u = await enterPassword();
    await u.type(await screen.findByLabelText("Code"), "111111");
    fireEvent.submit(screen.getByLabelText("Code").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right");
    expect(screen.getByText("Two-factor code")).toBeInTheDocument();
    await u.type(screen.getByLabelText("Code"), "222222");
    fireEvent.submit(screen.getByLabelText("Code").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in expired. Enter your password again.");
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});
