import { afterEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

describe("provider outbound policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    lookupMock.mockReset();
  });

  it("blocks provider SDK base URLs that resolve to private addresses in hosted mode", async () => {
    vi.stubEnv("DEPLOYMENT_MODE", "hosted");
    lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);

    const { ProviderFactory } = await import("../lib/providers/base");

    await expect(
      ProviderFactory.assertProviderOutboundAllowed({
        type: "OpenAI",
        baseUrl: "https://provider.example",
        apiKey: "key",
      }),
    ).rejects.toMatchObject({
      code: "HOSTED_PROXY_BLOCKED",
    });
  });

  it("fails closed for custom provider SDK base URLs in hosted mode", async () => {
    vi.stubEnv("DEPLOYMENT_MODE", "hosted");
    const { ProviderFactory } = await import("../lib/providers/base");

    expect(() =>
      ProviderFactory.createOpenAIClient({
        type: "OpenAI",
        baseUrl: "https://proxy.example/v1",
        apiKey: "test-key",
      }),
    ).toThrow(/Custom provider base URLs are disabled in hosted mode/i);
  });

  it("allows custom provider SDK base URLs in hosted mode when local network proxy override is enabled", async () => {
    vi.stubEnv("DEPLOYMENT_MODE", "hosted");
    vi.stubEnv("ALLOW_LOCAL_NETWORK_PROXY", "true");
    const { ProviderFactory } = await import("../lib/providers/base");

    expect(() =>
      ProviderFactory.createOpenAIClient({
        type: "OpenAI",
        baseUrl: "https://proxy.example/v1",
        apiKey: "test-key",
      }),
    ).not.toThrow();
  });

  it("keeps official provider base URLs available in hosted mode", async () => {
    vi.stubEnv("DEPLOYMENT_MODE", "hosted");
    const { ProviderFactory } = await import("../lib/providers/base");

    expect(() =>
      ProviderFactory.createOpenAIClient({
        type: "OpenAI",
        apiKey: "key",
      }),
    ).not.toThrow();
  });
});
