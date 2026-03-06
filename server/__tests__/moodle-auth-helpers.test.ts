import { describe, expect, it } from "vitest";

import { buildSessionCacheKey, isAuthErrorMessage, isLoginPageHtml } from "../moodle-proxy";

describe("Moodle auth helpers", () => {
  it("uses password in the session cache key", () => {
    const email = "faisol65287@gmail.com";
    expect(buildSessionCacheKey(email, "password-one")).not.toBe(
      buildSessionCacheKey(email, "password-two"),
    );
  });

  it("detects Moodle login html", () => {
    expect(isLoginPageHtml('<form id="login"><input name="logintoken" /></form>')).toBe(true);
    expect(isLoginPageHtml('<div class="dashboard"><span class="usertext">Teacher Demo</span></div>')).toBe(false);
  });

  it("classifies auth-related errors", () => {
    expect(isAuthErrorMessage("Invalid username/email or password")).toBe(true);
    expect(isAuthErrorMessage("Session expired. Please sign in again.")).toBe(true);
    expect(isAuthErrorMessage("Failed to fetch courses")).toBe(false);
  });
});
