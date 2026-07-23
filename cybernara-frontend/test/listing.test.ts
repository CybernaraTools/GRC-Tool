import { describe, expect, it } from "vitest";
import { pageHref, parsePage, textParam, unknownToText } from "../src/lib/listing";

describe("listing query helpers", () => {
  it("bounds limit and offset query values", () => {
    expect(parsePage({ requirementsLimit: "500", requirementsOffset: "30" }, "requirements")).toEqual({
      limit: 100,
      offset: 30
    });
    expect(parsePage({ requirementsLimit: "-1", requirementsOffset: "not-a-number" }, "requirements")).toEqual({
      limit: 25,
      offset: 0
    });
  });

  it("preserves filters while moving to another page offset", () => {
    expect(pageHref("/frameworks", { frameworkKey: "SOC2", requirementsLimit: "25" }, "requirements", 50)).toBe(
      "/frameworks?frameworkKey=SOC2&requirementsLimit=25&requirementsOffset=50"
    );
  });

  it("normalizes text and unknown values for display", () => {
    expect(textParam({ frameworkKey: " SOC2 " }, "frameworkKey")).toBe("SOC2");
    expect(unknownToText(null)).toBe("Not provided");
    expect(unknownToText(0)).toBe("0");
  });
});
