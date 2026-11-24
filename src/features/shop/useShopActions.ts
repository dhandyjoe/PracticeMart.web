import { useAccount } from "../../app/account";
import { useSnackbar } from "../../components/Snackbar";
import { stockOf, type Product, type Variant } from "../../data/catalog";
import { addLine, MAX_QTY_TEXT } from "../../domain/cartRules";

// PRD FR-SHOP-10: toast "Ditambahkan ke keranjang" + aksi "Lihat"; badge ikut bertambah.
export function useAddToCart() {
  const { account, update } = useAccount();
  const snackbar = useSnackbar();
  return async (product: Product, variant: Variant, qty = 1) => {
    let added = 0;
    await update("cart", (cart) => {
      const result = addLine(
        cart,
        { productId: product.id, color: variant.color, size: variant.size, qty },
        stockOf(account.stock, product.id, variant.key),
      );
      added = result.added;
      return result.cart;
    });
    snackbar(
      added
        ? { text: "Ditambahkan ke keranjang", action: { label: "Lihat", to: "/shop/cart", testid: "shop_btn_snackbar_view" } }
        : { text: MAX_QTY_TEXT },
    );
    return added;
  };
}

export function useWishlist(productId: string) {
  const { account, update } = useAccount();
  const on = account.state.wishlist.includes(productId);
  const toggle = () =>
    update("wishlist", (list) => (list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId]));
  return { on, toggle };
}
