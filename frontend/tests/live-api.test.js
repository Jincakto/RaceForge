import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
test("live API clients and session recovery", async (t) => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    define: { "import.meta.env.VITE_API_BASE_URL": '""' },
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { external: ["react", "react-dom", "react-router-dom", "recharts"] },
    appType: "custom",
  });
  const previous = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previous;
    return server.close();
  });
  const { membershipService } = await server.ssrLoadModule(
    "/src/services/membershipService.ts",
  );
  const { staffService } = await server.ssrLoadModule(
    "/src/services/staffService.ts",
  );
  const { horseService } = await server.ssrLoadModule(
    "/src/services/horseService.ts",
  );
  const { userService } = await server.ssrLoadModule(
    "/src/services/userService.ts",
  );
  const { refreshSession, cancelSession } = await server.ssrLoadModule(
    "/src/services/session.ts",
  );
  const { tokenStore } = await server.ssrLoadModule(
    "/src/services/tokenStore.ts",
  );
  const { request } = await server.ssrLoadModule("/src/services/api.ts");
  let calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ success: true, data: {} });
  };
  await membershipService.mine();
  assert.equal(calls.at(-1).url, "/api/users/me/registration-request");
  await membershipService.reject(8, "Missing information");
  assert.equal(calls.at(-1).url, "/api/registration-requests/8/reject");
  await staffService.list(2, "A&B", "", "2");
  assert.match(calls.at(-1).url, /search=A%26B/);
  await staffService.revoke("HEAD_TRAINER", "VIEW_TRAINING");
  assert.equal(calls.at(-1).options.method, "DELETE");
  await horseService.activate(14);
  assert.equal(calls.at(-1).url, "/api/horses/14/activate");
  assert.equal(calls.at(-1).options.method, "PATCH");
  await horseService.deactivate(14);
  assert.equal(calls.at(-1).url, "/api/horses/14/deactivate");
  await userService.update({ fullName: "Owner", phone: "", avatarUrl: "" });
  assert.equal(calls.at(-1).options.method, "PUT");
  assert.throws(() => horseService.activate(0), /ID/);
  await t.test(
    "concurrent requests share refresh and retry with the new bearer",
    async () => {
      let refreshCount = 0;
      globalThis.fetch = async (url, options) => {
        if (url.endsWith("/refresh")) {
          refreshCount++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return Response.json({
            success: true,
            data: {
              accessToken: "new-token",
              tokenType: "Bearer",
              expiresInSeconds: 3600,
            },
          });
        }
        return options.headers.get("Authorization") === "Bearer new-token"
          ? Response.json({ success: true, data: "ok" })
          : Response.json({ success: false }, { status: 401 });
      };
      tokenStore.set("old-token", 3600);
      assert.deepEqual(await Promise.all([request("/one"), request("/two")]), [
        "ok",
        "ok",
      ]);
      assert.equal(refreshCount, 1);
    },
  );
  await t.test("logout invalidates an in-flight refresh", async () => {
    let resolve;
    globalThis.fetch = () =>
      new Promise((r) => {
        resolve = r;
      });
    const pending = refreshSession("");
    cancelSession();
    resolve(
      Response.json({
        success: true,
        data: {
          accessToken: "stale",
          tokenType: "Bearer",
          expiresInSeconds: 3600,
        },
      }),
    );
    await assert.rejects(pending);
    assert.equal(tokenStore.get(), null);
  });
});
