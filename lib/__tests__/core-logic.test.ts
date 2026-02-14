import { describe, it, expect } from "vitest";

describe("Course name cleaning", () => {
  const getCleanCourseName = (fullname: string) => {
    const match = (fullname || "").match(/Arabic Language.*?Level\s*\d+/i);
    if (match) return match[0];
    return (fullname || "").replace(/^[A-Za-z]+-[A-Za-z0-9]+-\d+\s*-\s*/, "").replace(/\s*Onsite.*$/, "").trim() || fullname || "Course";
  };

  it("extracts clean name from Level 04 course", () => {
    const result = getCleanCourseName("Arb-L04-1416 - Arabic Language (MSA) Level 04 Onsite Code T (C25120266)");
    expect(result).toBe("Arabic Language (MSA) Level 04");
  });

  it("extracts clean name from Level 05 course", () => {
    const result = getCleanCourseName("Arb-L05-1416 - Arabic Language (MSA) Level 05 Onsite Code T (C26010326)");
    expect(result).toBe("Arabic Language (MSA) Level 05");
  });

  it("handles empty string", () => {
    const result = getCleanCourseName("");
    expect(result).toBe("Course");
  });

  it("handles course without standard format", () => {
    const result = getCleanCourseName("My Custom Course");
    expect(result).toBe("My Custom Course");
  });
});

describe("Level number extraction", () => {
  it("extracts level number from fullname", () => {
    const fullname = "Arb-L04-1416 - Arabic Language (MSA) Level 04 Onsite Code T";
    const levelMatch = fullname.match(/Level\s*(\d+)/i);
    expect(levelMatch).not.toBeNull();
    expect(levelMatch![1]).toBe("04");
  });

  it("extracts level 05", () => {
    const fullname = "Arb-L05-1416 - Arabic Language (MSA) Level 05 Onsite Code T";
    const levelMatch = fullname.match(/Level\s*(\d+)/i);
    expect(levelMatch![1]).toBe("05");
  });
});

describe("Progress calculation", () => {
  const getProgressPercent = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  it("returns 0 for no activities", () => {
    expect(getProgressPercent(0, 0)).toBe(0);
  });

  it("returns 0 for no completed activities", () => {
    expect(getProgressPercent(0, 172)).toBe(0);
  });

  it("calculates correct percentage", () => {
    expect(getProgressPercent(86, 172)).toBe(50);
  });

  it("returns 100 for all completed", () => {
    expect(getProgressPercent(172, 172)).toBe(100);
  });

  it("rounds correctly", () => {
    expect(getProgressPercent(1, 3)).toBe(33);
  });
});

describe("Activity type icon mapping", () => {
  const MOD_ICONS: Record<string, { icon: string; color: string; label: string }> = {
    page: { icon: "description", color: "#0C6478", label: "Page" },
    book: { icon: "menu-book", color: "#7C3AED", label: "Book" },
    videotime: { icon: "play-circle-filled", color: "#DC2626", label: "Video" },
    hvp: { icon: "extension", color: "#EA580C", label: "Interactive" },
    h5pactivity: { icon: "extension", color: "#EA580C", label: "Interactive" },
    quiz: { icon: "quiz", color: "#059669", label: "Quiz" },
    assign: { icon: "assignment", color: "#2563EB", label: "Assignment" },
    url: { icon: "link", color: "#6366F1", label: "Link" },
    forum: { icon: "forum", color: "#0891B2", label: "Forum" },
    attendance: { icon: "event-available", color: "#65A30D", label: "Attendance" },
    resource: { icon: "attach-file", color: "#9333EA", label: "Resource" },
    feedback: { icon: "rate-review", color: "#D97706", label: "Feedback" },
  };

  it("maps page type correctly", () => {
    expect(MOD_ICONS["page"].label).toBe("Page");
    expect(MOD_ICONS["page"].icon).toBe("description");
  });

  it("maps video type correctly", () => {
    expect(MOD_ICONS["videotime"].label).toBe("Video");
  });

  it("maps interactive types correctly", () => {
    expect(MOD_ICONS["hvp"].label).toBe("Interactive");
    expect(MOD_ICONS["h5pactivity"].label).toBe("Interactive");
  });

  it("has all expected activity types", () => {
    const expectedTypes = ["page", "book", "videotime", "hvp", "h5pactivity", "quiz", "assign", "url", "forum", "attendance", "resource", "feedback"];
    for (const type of expectedTypes) {
      expect(MOD_ICONS[type]).toBeDefined();
    }
  });
});
