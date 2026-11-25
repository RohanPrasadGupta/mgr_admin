"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { authPost, type LoginStep } from "@/lib/api/client";
import { Wordmark } from "./brand";
import { Button, Card, ErrorNote, Field, Input } from "./ui";

/** Renders the otpauth:// URL as a QR code locally: the secret never goes to a third-party QR service. */
function Qr({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 1, width: 192, color: { dark: "#000000", light: "#ffffff" } }).then((s) => { if (live) setSvg(s); }).catch(() => setSvg(null));
    return () => { live = false; };
  }, [url]);
  if (!svg) return <div className="size-48 rounded-lg bg-border/50" aria-hidden />;
  return <div role="img" aria-label="QR code for your authenticator app" className="size-48 overflow-hidden rounded-lg bg-white" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Groups the base32 secret in fours so it can be typed by hand. */
const grouped = (s: string) => s.replace(/(.{4})/g, "$1 ").trim();

export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<LoginStep | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const s = await authPost<LoginStep>("login", { email, password });
      setPassword(""); setCode(""); setStep(s ?? null);
    } catch (err) { setError(err as Error); } finally { setBusy(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await authPost("mfa", { code });
      onSignedIn();
    } catch (err) {
      const ex = err as Error & { status?: number };
      setCode("");
      if (ex.status === 401) { setStep(null); setError(new Error("Sign-in expired. Enter your password again.")); } else setError(ex);
    } finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="fade-in w-full max-w-sm space-y-5 p-6">
        <div className="space-y-2">
          <Wordmark height={26} priority />
          <p className="text-sm font-medium text-warn">Admin console</p>
        </div>

        {!step && (
          <form onSubmit={submitPassword} className="space-y-3">
            <h1 className="text-lg font-semibold">Sign in</h1>
            <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
            <Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            {error && <ErrorNote error={error} />}
            <Button type="submit" className="w-full" loading={busy}>Continue</Button>
          </form>
        )}

        {step && (
          <form onSubmit={submitCode} className="space-y-3">
            {step.step === "setup" ? (
              <>
                <h1 className="text-lg font-semibold">Set up two-factor sign-in</h1>
                <p className="text-sm text-muted">Admin accounts need an authenticator app (Google Authenticator, 1Password, Authy…). Scan the code, then enter the 6 digits it shows.</p>
                {step.otpauthUrl && <div className="flex justify-center"><Qr url={step.otpauthUrl} /></div>}
                {step.secret && (
                  <p className="text-xs text-muted">Can&apos;t scan? Enter this key: <code className="block select-all break-all pt-1 font-mono text-sm text-fg">{grouped(step.secret)}</code></p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold">Two-factor code</h1>
                <p className="text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
              </>
            )}
            <Field label="Code">
              <Input inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus className="font-mono tracking-[0.4em]" />
            </Field>
            {error && <ErrorNote error={error} />}
            <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>{step.step === "setup" ? "Turn on and sign in" : "Sign in"}</Button>
            <button type="button" onClick={() => { setStep(null); setError(null); }} className="w-full text-center text-sm text-muted hover:text-fg">Use a different account</button>
          </form>
        )}
      </Card>
    </main>
  );
}
