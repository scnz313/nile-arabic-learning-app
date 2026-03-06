import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";

import { mergeSectionsByNameAndActivityId, parseAllSections } from "../moodle-proxy";

describe("Moodle course section parsing", () => {
  it("captures hidden midterm and final quizzes from expanded course html", () => {
    const $ = cheerio.load(`
      <ul>
        <li class="section">
          <h3 class="sectionname">Lesson 1</h3>
          <ul>
            <li id="module-5001" class="activity modtype_page">
              <a href="/mod/page/view.php?id=5001"><span class="instancename">Welcome Lesson</span></a>
            </li>
          </ul>
        </li>
        <li class="section hidden">
          <h3 class="sectionname">Midterm Assessment</h3>
          <ul>
            <li id="module-6001" class="activity modtype_quiz dimmed">
              <a href="/mod/quiz/view.php?id=6001"><span class="instancename">Midterm Quiz</span></a>
              <div class="availabilityinfoisrestricted">Not available unless: Complete lesson 5</div>
            </li>
          </ul>
        </li>
        <li class="section">
          <h3 class="sectionname">Final Assessment</h3>
          <ul>
            <li id="module-6002" class="activity modtype_quiz stealth">
              <a href="/mod/quiz/view.php?id=6002"><span class="instancename">Final Quiz</span></a>
            </li>
          </ul>
        </li>
      </ul>
    `);

    const sections = parseAllSections($);

    expect(sections).toHaveLength(3);
    expect(sections[1].activities[0]).toMatchObject({
      id: "6001",
      name: "Midterm Quiz",
      modType: "quiz",
      hidden: true,
    });
    expect(sections[2].activities[0]).toMatchObject({
      id: "6002",
      name: "Final Quiz",
      modType: "quiz",
      hidden: true,
    });
  });

  it("merges visible lesson sections with expanded hidden quiz sections", () => {
    const visibleSections = [
      {
        name: "Lesson 1",
        activities: [{ id: "5001", name: "Welcome Lesson", modType: "page", url: "https://example.com/page/5001" }],
      },
    ];
    const expandedSections = [
      {
        name: "Lesson 1",
        activities: [{ id: "5001", name: "Welcome Lesson", modType: "page", url: "https://example.com/page/5001" }],
      },
      {
        name: "Midterm Assessment",
        activities: [{ id: "6001", name: "Midterm Quiz", modType: "quiz", url: "https://example.com/quiz/6001", hidden: true }],
      },
      {
        name: "Final Assessment",
        activities: [{ id: "6002", name: "Final Quiz", modType: "quiz", url: "https://example.com/quiz/6002", hidden: true }],
      },
    ];

    const merged = mergeSectionsByNameAndActivityId(visibleSections, expandedSections);

    expect(merged).toHaveLength(3);
    expect(merged[0].activities).toHaveLength(1);
    expect(merged[1].activities[0].name).toBe("Midterm Quiz");
    expect(merged[2].activities[0].name).toBe("Final Quiz");
  });
});
