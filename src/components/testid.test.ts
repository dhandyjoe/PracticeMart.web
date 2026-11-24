import { expect, it } from "vitest";
import { tid } from "./testid";

it("elemen unik: id = data-testid; item list: hanya data-testid", () => {
  expect(tid("shop_btn_login")).toEqual({ id: "shop_btn_login", "data-testid": "shop_btn_login" });
  expect(tid.list("shop_item_product_row")).toEqual({ "data-testid": "shop_item_product_row" });
});
