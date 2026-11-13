import { useState, useMemo, useRef } from "react";
import { auth } from "../api/authApi";
import { type AppUser, type Club, type MemberRequest } from "../../../shared/data/data";
import { Card, Input, Btn, Badge } from "../../../shared/ui/ui";
import { type Page } from "../../../app/appTypes";
import { passwordSetupLink, createPasswordSetupSubmitter, requestPasswordReset, passwordSetupError } from "../hooks/passwordSetup";
import { userFromApi } from "../../../app/remote";
import { UserAvatarDropdown } from "../../../app/AppLayout";

function OTPModal({
  email,
  code,
  onVerify,
  onClose,
}: {
  email: string;
  code: string;
  onVerify: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(input)) {
      setError("Enter the six-digit verification code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.verify(email, input);
      await onVerify();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#c9973b]/15 flex items-center justify-center text-3xl mx-auto mb-4">
            📧
          </div>
          <h3 className="font-serif font-bold text-xl text-[#0f1729]">
            Verify email
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Code sent to <strong className="text-[#0f1729]">{email}</strong>
          </p>
        </div>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="text-xs text-amber-600 font-medium mb-1">
            🔐 Verification code from your email
          </div>
          <div className="font-mono text-2xl font-bold text-[#c9973b] tracking-[0.4em]">
            <button
              type="button"
              onClick={async () => {
                try {
                  await auth.resend(email);
                  setError("Verification code sent again.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Resend code
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <input
            value={input}
            onChange={(e) =>
              setInput(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#c9973b]"
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={verify}
            className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all"
          >
            Confirm →
          </button>
        </div>
      </div>
    </div>
  );
}

function FirstPasswordChange({
  user,
  onSave,
}: {
  user: AppUser;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (password.length < 8)
      return setError("New password must contain at least 8 characters.");
    if (password === user.password)
      return setError("New password must differ from the temporary password.");
    if (password !== confirm) return setError("Passwords do not match.");
    onSave(password);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1729] p-4">
      <Card className="w-full max-w-md p-7">
        <div className="mb-5">
          <h2 className="font-serif text-xl font-bold text-[#0f1729]">
            Set your new password
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your staff account is using a temporary password provided by an
            administrator.
          </p>
        </div>
        <div className="space-y-4">
          <Input
            label="New password"
            type="password"
            required
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            hint="At least 8 characters, different from the temporary password."
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setError("");
            }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Btn
            variant="gold"
            className="w-full justify-center"
            onClick={submit}
          >
            Change password and sign in
          </Btn>
        </div>
      </Card>
    </div>
  );
}

export function HomePage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#0f1729] overflow-x-hidden">
      <nav className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">
            🐎
          </div>
          <div>
            <div className="text-white font-serif font-bold text-lg leading-none">
              RaceForce
            </div>
            <div className="text-[#c9973b] text-[10px] tracking-widest uppercase">
              Horse Racing Management
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("login")}
            className="px-5 py-2 text-sm text-gray-300 hover:text-white font-medium transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("register")}
            className="px-5 py-2 bg-[#c9973b] hover:bg-[#b8852a] text-white text-sm font-semibold rounded-lg transition-all"
          >
            Register
          </button>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-10 pt-20 pb-16 grid grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c9973b]/20 border border-[#c9973b]/30 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9973b] animate-pulse" />
            <span className="text-[#c9973b] text-xs font-medium tracking-wider uppercase">
              Racehorse management platform
            </span>
          </div>
          <h1 className="text-white font-serif text-5xl font-bold leading-tight mb-5">
            Professional racehorse
            <br />
            <span className="text-[#c9973b]">training club</span>
            <br />
            management
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Health, AI training plans, daily care and race results — all in one
            system.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("register")}
              className="px-7 py-3.5 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-base shadow-lg shadow-[#c9973b]/20"
            >
              Get started free →
            </button>
            <button
              onClick={() => navigate("login")}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-all text-base border border-white/20"
            >
              Sign in
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <img
              src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=700&h=500&fit=crop&auto=format"
              alt="Racehorse"
              className="w-full h-80 object-cover"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                ✓
              </div>
              <div>
                <div className="font-semibold text-sm">Thunder King</div>
                <div className="text-xs text-gray-500">Eligible to race</div>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-[#1a2844] rounded-xl p-4 shadow-xl">
            <div className="text-white text-xs font-medium opacity-60 mb-1">
              AI recommendation
            </div>
            <div className="text-[#c9973b] font-serif text-lg font-bold">
              Race preparation
            </div>
            <div className="text-white text-xs opacity-60">Prep · 88/100</div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-10 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: "🤖",
              title: "Smart training plans",
              desc: "The system recommends a training plan based on health, age, weight and veterinarian findings.",
            },
            {
              icon: "🏥",
              title: "Digital health examinations",
              desc: "Veterinarians record vital signs and clinical findings that feed directly into training recommendations.",
            },
            {
              icon: "👥",
              title: "Clear role-based workflows",
              desc: "Club Manager, Trainer, Veterinarian, Groom and Horse Owner each have a dedicated workflow.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl transition-all"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="text-white font-semibold mb-2">{f.title}</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-6 px-10 flex items-center justify-between">
        <div className="text-white text-sm font-serif font-bold">
          RaceForce <span className="text-gray-600">© 2026</span>
        </div>
        <div className="text-gray-600 text-sm">
          Racehorse training club management system
        </div>
      </div>
    </div>
  );
}

export function LoginPage({
  navigate,
  users,
  onLogin,
}: {
  navigate: (p: Page) => void;
  users: AppUser[];
  onLogin: (u: AppUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [forgot, setForgot] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setup, setSetup] = useState(() =>
    passwordSetupLink(window.location.search),
  );
  const submitSetup = useMemo(
    () => (setup ? createPasswordSetupSubmitter(setup) : null),
    [setup],
  );
  const submitting = useRef(false);
  const di =
    "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]";

  const handle = async () => {
    if (submitting.current) return;
    if (setup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!setup && !forgot && (!email.trim() || !password)) {
      setError("Please enter your email and password");
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (forgot && !setup) {
        await requestPasswordReset(email);
        setNotice(
          "If an account with a password exists for this email, a link has been sent. Check your inbox and spam folder. Accounts awaiting activation must use the administrator's invitation email.",
        );
        return;
      }
      if (setup && submitSetup) {
        await submitSetup(password);
        window.history.replaceState({}, "", "/");
        setSetup(null);
        setPassword("");
        setConfirmPassword("");
        setEmail("");
        setNotice(
          "Password set. Sign in with your account email and new password.",
        );
        navigate("login");
        return;
      }
      onLogin(userFromApi(await auth.login(email.trim(), password)));
    } catch (e) {
      setError(
        setup ? passwordSetupError(e, setup.invitation) : (e as Error).message,
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1729] flex">
      <div className="flex-1 flex flex-col items-center justify-center px-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, #c9973b 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 w-full max-w-sm">
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
          >
            ← Home
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">
              🐎
            </div>
            <div>
              <div className="text-white font-serif font-bold text-xl">
                RaceForce
              </div>
              <div className="text-[#c9973b] text-xs">
                Horse Racing Management
              </div>
            </div>
          </div>
          <h2 className="text-white font-serif text-3xl font-bold mb-6">
            {setup
              ? setup.invitation
                ? "Activate staff account"
                : "Set new password"
              : forgot
                ? "Forgot password"
                : "Sign in"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled={!!setup}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  setup
                    ? "Your account is identified by the email link"
                    : "email@example.com"
                }
                className={di}
              />
            </div>
            {!forgot && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {setup ? "New password" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  disabled={loading}
                  autoComplete={setup ? "new-password" : "current-password"}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={di}
                  onKeyDown={(e) => e.key === "Enter" && handle()}
                />
              </div>
            )}
            {setup && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  disabled={loading}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={di}
                  onKeyDown={(e) => e.key === "Enter" && handle()}
                />
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {notice && (
              <div
                className="p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-sm"
                role="status"
              >
                {notice}
              </div>
            )}
            <button
              onClick={handle}
              disabled={loading}
              className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-60"
            >
              {setup
                ? loading
                  ? "Setting password..."
                  : "Set password"
                : forgot
                  ? loading
                    ? "Sending..."
                    : "Send email link"
                  : loading
                    ? "Signing in..."
                    : "Sign in →"}
            </button>
          </div>
          {!setup && (
            <button
              disabled={loading}
              onClick={() => {
                setForgot(!forgot);
                setPassword("");
                setConfirmPassword("");
                setError("");
                setNotice("");
              }}
              className="mt-4 text-[#c9973b] hover:underline text-sm"
            >
              {forgot ? "Back to sign in" : "Forgot password?"}
            </button>
          )}
          <p className="text-center text-gray-500 text-sm mt-5">
            No account yet?{" "}
            <button
              onClick={() => navigate("register")}
              className="text-[#c9973b] hover:underline font-medium"
            >
              Register
            </button>
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            Staff accounts are issued by an administrator.
          </p>
        </div>
      </div>
      <div className="w-[42%] relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&h=1000&fit=crop&auto=format"
          alt="Horse"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        <div className="absolute bottom-12 left-8 right-8">
          <blockquote className="text-white font-serif text-xl font-bold leading-snug">
            "Every training session is a step
            <br />
            towards the next victory."
          </blockquote>
          <p className="text-[#c9973b] text-sm mt-2">
            RaceForce · Professional racing platform
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage({
  navigate,
  onRegister,
}: {
  navigate: (p: Page) => void;
  onRegister: (u: AppUser) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const otpCode = useRef("");
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const di =
    "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]";

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Please complete all required fields");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters");
      return;
    }
    try {
      await auth.register({
        fullName: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      setError("");
      setShowOtp(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleVerified = async () => {
    onRegister(userFromApi(await auth.login(form.email.trim(), form.password)));
  };

  return (
    <>
      {showOtp && (
        <OTPModal
          email={form.email}
          code={otpCode.current}
          onVerify={handleVerified}
          onClose={() => setShowOtp(false)}
        />
      )}
      <div className="min-h-screen bg-[#0f1729] flex">
        <div className="flex-1 flex flex-col items-center justify-center px-10">
          <div className="w-full max-w-sm">
            <button
              onClick={() => navigate("home")}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
            >
              ← Home
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#c9973b] flex items-center justify-center text-xl">
                🐎
              </div>
              <div>
                <div className="text-white font-serif font-bold text-xl">
                  RaceForce
                </div>
                <div className="text-[#c9973b] text-xs">
                  Horse Racing Management
                </div>
              </div>
            </div>
            <h2 className="text-white font-serif text-3xl font-bold mb-2">
              Create account
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Registration is for <b className="text-[#c9973b]">Horse Owners</b>
              . Staff accounts are issued by an administrator.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Full name"
                  className={di}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="you@example.com"
                  className={di}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Phone number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  placeholder="0912 345 678"
                  className={di}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  placeholder="At least 8 characters"
                  className={di}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confirm password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm")(e.target.value)}
                  placeholder="Enter again"
                  className={di}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-[#c9973b] hover:bg-[#b8852a] text-white font-semibold rounded-xl transition-all text-sm"
              >
                Send OTP code →
              </button>
            </div>
            <p className="text-center text-gray-500 text-sm mt-5">
              Already have an account?{" "}
              <button
                onClick={() => navigate("login")}
                className="text-[#c9973b] hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
        <div className="w-[42%] relative hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1566288623394-377af472d81b?w=800&h=1000&fit=crop&auto=format"
            alt="Horse"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1729] to-transparent" />
        </div>
      </div>
    </>
  );
}

function OnboardingPage({
  user,
  navigate,
  onLogout,
}: {
  user: AppUser;
  navigate: (p: Page) => void;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10">
        <UserAvatarDropdown user={user} onLogout={onLogout} />
      </div>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#c9973b] flex items-center justify-center text-3xl mx-auto mb-5">
            🐎
          </div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">
            Welcome, {user.name.split(" ").pop()}!
          </h2>
          <p className="text-gray-400">
            Your account is verified. Join a training club to get started.
          </p>
        </div>
        <div className="max-w-md w-full">
          <button
            onClick={() => navigate("join-center")}
            className="w-full p-8 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#c9973b]/50 rounded-2xl text-left transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center text-2xl mb-5">
              🤝
            </div>
            <h3 className="text-white font-serif text-xl font-bold mb-2">
              Join a training club
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Find a club and send a membership request. The Club Manager will
              review your request and assign your role.
            </p>
            <div className="text-emerald-400 text-sm font-semibold">
              Find a club →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinCenterPage({
  user,
  clubs,
  navigate,
  onJoinRequest,
  onLogout,
}: {
  user: AppUser;
  clubs: Club[];
  navigate: (p: Page) => void;
  onJoinRequest: (clubId: string) => void;
  onLogout: () => void;
}) {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const filtered = clubs.filter(
    (c) =>
      c.managerId !== user.id &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-[#0f1729] px-6 py-10 relative">
      <div className="absolute top-5 right-6 z-10">
        <UserAvatarDropdown user={user} onLogout={onLogout} />
      </div>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("onboarding")}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8"
        >
          ← Back
        </button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800/50 border border-emerald-700/30 flex items-center justify-center text-3xl mx-auto mb-4">
            🤝
          </div>
          <h2 className="text-white font-serif text-3xl font-bold mb-2">
            Join a club
          </h2>
          <p className="text-gray-400 text-sm">
            Send a request and wait for the Club Manager to assign your role
          </p>
        </div>
        <div className="relative mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs by name..."
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9973b]"
          />
          <span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span>
        </div>
        <div className="space-y-4">
          {filtered.map((club) => {
            const sent = requested.has(club.id);
            return (
              <div
                key={club.id}
                className="bg-white/5 border border-white/15 rounded-xl p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1a2844] border border-white/10 flex items-center justify-center text-white font-serif font-bold text-lg">
                  {club.logoLetter}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{club.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    📍 {club.location} · 👥 {club.memberCount} members ·{" "}
                    {club.founded}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {club.description}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!sent) {
                      setRequested((p) => new Set([...p, club.id]));
                      onJoinRequest(club.id);
                    }
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sent ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 cursor-default" : "bg-[#c9973b] hover:bg-[#b8852a] text-white"}`}
                >
                  {sent ? "✓ Sent" : "Send request"}
                </button>
              </div>
            );
          })}
        </div>
        {requested.size > 0 && (
          <div className="mt-8 p-5 bg-emerald-900/30 border border-emerald-700/30 rounded-xl text-center">
            <div className="text-emerald-400 font-semibold mb-1">
              ✓ Request sent!
            </div>
            <div className="text-emerald-600 text-sm">
              The Club Manager will review your request and assign your role.
            </div>
            <button
              onClick={() => navigate("pending")}
              className="mt-4 px-5 py-2 bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 text-sm rounded-lg transition-all"
            >
              View status →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingPage({
  user,
  clubs,
  navigate,
  memberRequests,
  onLogout,
}: {
  user: AppUser;
  clubs: Club[];
  navigate: (p: Page) => void;
  memberRequests: MemberRequest[];
  onLogout: () => void;
}) {
  const myReqs = memberRequests.filter((r) => r.userId === user.id);
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-5 right-6 z-10">
        <UserAvatarDropdown user={user} onLogout={onLogout} />
      </div>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-900/30 border border-amber-700/30 flex items-center justify-center text-4xl mx-auto mb-6">
          ⏳
        </div>
        <h2 className="text-white font-serif text-2xl font-bold mb-2">
          Awaiting approval
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          Your membership request is being reviewed by the Club Manager.
        </p>
        <div className="space-y-3 mb-8">
          {myReqs.map((r) => {
            const club = clubs.find((c) => c.id === r.clubId);
            return (
              <div
                key={r.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1a2844] flex items-center justify-center text-white font-bold">
                  {club?.logoLetter || "?"}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">
                    {club?.name}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {r.requestedAt} · Expired {r.expiresAt}
                  </div>
                </div>
                <Badge status={r.status} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("join-center")}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
          >
            Find another club
          </button>
        </div>
      </div>
    </div>
  );
}
