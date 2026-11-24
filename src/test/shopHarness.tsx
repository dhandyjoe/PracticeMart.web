import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AppLayout } from "../app/AppLayout";
import AccountPage from "../routes/AccountPage";
import CartPage from "../routes/CartPage";
import CheckoutPage from "../routes/CheckoutPage";
import CheckoutResultPage from "../routes/CheckoutResultPage";
import HelpPage from "../routes/HelpPage";
import SettingsPage from "../routes/SettingsPage";
import NotFoundPage from "../routes/NotFoundPage";
import OrderDetailPage from "../routes/OrderDetailPage";
import OrdersPage from "../routes/OrdersPage";
import PayPage from "../routes/PayPage";
import PayQrPage from "../routes/PayQrPage";
import ProductPage from "../routes/ProductPage";
import SearchPage from "../routes/SearchPage";
import WishlistPage from "../routes/WishlistPage";
import ShopHomePage from "../routes/ShopHomePage";

export function renderShop(path: string | { pathname: string; state?: unknown }) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <ShopHomePage /> },
          { path: "/shop/search", element: <SearchPage /> },
          { path: "/shop/product/:id", element: <ProductPage /> },
          { path: "/shop/cart", element: <CartPage /> },
          { path: "/checkout", element: <CheckoutPage /> },
          { path: "/checkout/result", element: <CheckoutResultPage /> },
          { path: "/checkout/result/:orderId", element: <CheckoutResultPage /> },
          { path: "/shop/orders", element: <OrdersPage /> },
          { path: "/shop/order/:orderId", element: <OrderDetailPage /> },
          { path: "/shop/wishlist", element: <WishlistPage /> },
          { path: "/pay", element: <PayPage /> },
          { path: "/pay/qr", element: <PayQrPage /> },
          { path: "/account", element: <AccountPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/help", element: <HelpPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

