import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Instrumentasi coverage memperlambat render; 1 dtk default terlalu mepet untuk alur multi-langkah.
configure({ asyncUtilTimeout: 3_000 });

afterEach(() => {
  cleanup();
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
  }
});
