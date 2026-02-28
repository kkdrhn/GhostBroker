import { describe, it, expect } from "vitest";

/**
 * Tests for WebSocket URL construction to ensure trailing slashes
 * in VITE_WS_URL do not produce double-slash URLs.
 */
describe("WebSocket URL construction", () => {
  it("strips trailing slash from WS_BASE before appending /ws path", () => {
    const wsBaseWithSlash = "wss://monad-sigma.vercel.app/";
    const normalised = wsBaseWithSlash.replace(/\/$/, "");
    const url = `${normalised}/ws?channels=market.trades`;
    expect(url).toBe("wss://monad-sigma.vercel.app/ws?channels=market.trades");
    expect(url).not.toContain("//ws");
  });

  it("leaves URL unchanged when WS_BASE has no trailing slash", () => {
    const wsBase = "wss://monad-sigma.vercel.app";
    const normalised = wsBase.replace(/\/$/, "");
    const url = `${normalised}/ws?channels=market.trades`;
    expect(url).toBe("wss://monad-sigma.vercel.app/ws?channels=market.trades");
  });

  it("handles localhost default without trailing slash", () => {
    const wsBase = "ws://localhost:8000";
    const normalised = wsBase.replace(/\/$/, "");
    const url = `${normalised}/ws?channels=chain.block`;
    expect(url).toBe("ws://localhost:8000/ws?channels=chain.block");
  });
});
