import { useEffect, useState } from "react";
import { useApp } from "../../hooks/useApp.js";
import { userService } from "../../services/userService.ts";
import { toAppUser } from "../../services/authService.ts";
export function LiveProfile() {
  const { setState, handleLogout } = useApp();
  const [form, setForm] = useState(null),
    [password, setPassword] = useState({
      currentPassword: "",
      newPassword: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    userService
      .me()
      .then((u) => {
        if (active) setForm(u);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  async function run(action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const input = (key, label, type = "text") => (
    <label className="block" key={key}>
      {label}
      <input
        className="block border rounded p-2 w-full"
        type={type}
        maxLength={key === "fullName" ? 150 : key === "phone" ? 20 : 500}
        required={key === "fullName"}
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {form ? (
        <>
          <p>
            {form.email} · {form.role?.roleName} · {form.status}
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const u = await userService.update({
                  fullName: form.fullName.trim(),
                  phone: form.phone || "",
                  avatarUrl: form.avatarUrl || "",
                });
                setForm(u);
                setState((s) => ({ ...s, user: toAppUser(u) }));
                setNotice("Đã lưu hồ sơ.");
              });
            }}
          >
            {input("fullName", "Họ tên")}
            {input("phone", "Số điện thoại", "tel")}
            {input("avatarUrl", "URL ảnh đại diện", "url")}
            <button
              disabled={busy}
              className="bg-amber-600 text-white rounded px-4 py-2"
            >
              Lưu hồ sơ
            </button>
          </form>
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await userService.password(
                  password.currentPassword,
                  password.newPassword,
                );
                handleLogout();
              });
            }}
          >
            <h2 className="font-bold">Đổi mật khẩu</h2>
            {["currentPassword", "newPassword"].map((k) => (
              <label className="block" key={k}>
                {k === "currentPassword" ? "Mật khẩu hiện tại" : "Mật khẩu mới"}
                <input
                  required
                  type="password"
                  autoComplete={
                    k === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={k === "newPassword" ? 8 : undefined}
                  maxLength={100}
                  className="block border rounded p-2 w-full"
                  value={password[k]}
                  onChange={(e) =>
                    setPassword({ ...password, [k]: e.target.value })
                  }
                />
              </label>
            ))}
            <p className="text-sm">
              Đổi mật khẩu thành công sẽ đăng xuất để bảo vệ tài khoản.
            </p>
            <button disabled={busy} className="border rounded px-4 py-2">
              Đổi mật khẩu
            </button>
          </form>
        </>
      ) : (
        !error && <p role="status">Đang tải...</p>
      )}
      <button disabled={busy} onClick={handleLogout} className="text-red-700">
        Đăng xuất
      </button>
    </div>
  );
}
