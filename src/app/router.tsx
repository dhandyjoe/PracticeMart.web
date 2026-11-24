import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { AppLayout } from "./AppLayout";
import { RequireAuth } from "./session";

const page = (load: () => Promise<{ default: ComponentType }>) => ({
  lazy: { Component: async () => (await load()).default },
});

const shopHome = () => import("../routes/ShopHomePage");

// URL mengikuti PRD §6.2.
// Factory: router mengubah objek route lazy saat dimuat, jadi tiap router butuh salinan sendiri.
export const appRoutes = (): RouteObject[] => [
  { path: "/login", ...page(() => import("../routes/LoginPage")) },
  { path: "/register", ...page(() => import("../routes/RegisterPage")) },
  { path: "/terms", ...page(() => import("../routes/TermsPage")) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", ...page(shopHome) },
          { path: "/shop", ...page(shopHome) },
          { path: "/shop/search", ...page(() => import("../routes/SearchPage")) },
          { path: "/shop/product/:id", ...page(() => import("../routes/ProductPage")) },
          { path: "/shop/cart", ...page(() => import("../routes/CartPage")) },
          { path: "/checkout", ...page(() => import("../routes/CheckoutPage")) },
          { path: "/checkout/result", ...page(() => import("../routes/CheckoutResultPage")) },
          { path: "/checkout/result/:orderId", ...page(() => import("../routes/CheckoutResultPage")) },
          { path: "/shop/orders", ...page(() => import("../routes/OrdersPage")) },
          { path: "/shop/order/:orderId", ...page(() => import("../routes/OrderDetailPage")) },
          { path: "/shop/wishlist", ...page(() => import("../routes/WishlistPage")) },
          { path: "/pay", ...page(() => import("../routes/PayPage")) },
          { path: "/pay/qr", ...page(() => import("../routes/PayQrPage")) },
          { path: "/account", ...page(() => import("../routes/AccountPage")) },
          { path: "/settings", ...page(() => import("../routes/SettingsPage")) },
          { path: "/help", ...page(() => import("../routes/HelpPage")) },
          { path: "*", ...page(() => import("../routes/NotFoundPage")) },
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(appRoutes());
