// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REDIRECT_KEY, RequireAuth, SessionProvider } from "./session";
import { appRoutes } from "./router";

vi.mock("../data/firebase", () => ({ auth: "AUTH", db: "DB" }));
vi.mock("firebase/auth", async (orig) => ({
  ...(await orig<typeof import("firebase/auth")>()),
  onAuthStateChanged: vi.fn(),
}));

let emit: (user: User | null) => void;
const unsubscribe = vi.fn();

beforeEach(() => {
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
    emit = cb as typeof emit;
    return unsubscribe;
  });
});

function renderAt(path: string, routeList: RouteObject[] = [
  { path: "/login", element: <p>LOGIN</p> },
  { element: <RequireAuth />, children: [{ path: "/orders", element: <p>ORDERS</p> }] },
]) {
  const router = createMemoryRouter(routeList, { initialEntries: [path] });
  const view = render(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
  return { router, ...view };
}

describe("RequireAuth", () => {
  it("menunggu onAuthStateChanged pertama: tidak render apa pun", () => {
    renderAt("/orders");
    expect(screen.queryByText("ORDERS")).toBeNull();
    expect(screen.queryByText("LOGIN")).toBeNull();
  });

  it("tanpa sesi → /login dan URL tujuan disimpan", async () => {
    const { router } = renderAt("/orders?tab=done#x");
    act(() => emit(null));
    expect(await screen.findByText("LOGIN")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(sessionStorage.getItem(REDIRECT_KEY)).toBe("/orders?tab=done#x");
  });

  it("ada sesi → halaman terproteksi tampil", () => {
    renderAt("/orders");
    act(() => emit({ uid: "u1" } as User));
    expect(screen.getByText("ORDERS")).toBeInTheDocument();
  });

  it("berhenti mendengarkan saat unmount", () => {
    const { unmount } = renderAt("/orders");
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("router", () => {
  it("/login dan /register dimuat lazy", async () => {
    renderAt("/login", appRoutes());
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeInTheDocument();
    renderAt("/register", appRoutes());
    expect(await screen.findByRole("heading", { name: "Buat akun" })).toBeInTheDocument();
  });

  it("setiap route lazy memuat komponen halaman", async () => {
    const lazies: (() => Promise<unknown>)[] = [];
    const walk = (list: RouteObject[]) =>
      list.forEach((r) => {
        const lazy = r.lazy as { Component?: () => Promise<unknown> } | undefined;
        if (lazy?.Component) lazies.push(lazy.Component);
        if (r.children) walk(r.children);
      });
    walk(appRoutes());
    expect(lazies).toHaveLength(20);
    for (const load of lazies) expect(typeof (await load())).toBe("function");
  });
});
