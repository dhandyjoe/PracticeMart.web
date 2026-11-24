// Architecture §11.1: elemen unik punya id = data-testid; item list hanya data-testid.
export const tid = Object.assign((name: string) => ({ id: name, "data-testid": name }), {
  list: (name: string) => ({ "data-testid": name }),
});
