import { describe, it, expect } from "vitest";
import { escapeXmlText, escapeXmlAttribute, escapeContent, looksLikeMarkup, wrapCdata } from "./escape.js";

describe("escapeXmlText", () => {
  it("escapes ampersands and less-than, and leaves quotes alone", () => {
    expect(escapeXmlText('a & b < c "d"')).toBe('a &amp; b &lt; c "d"');
  });

  it("leaves a bare greater-than alone so arrows stay readable", () => {
    expect(escapeXmlText("map: in -> out, cb => value, if (a > b)")).toBe(
      "map: in -> out, cb => value, if (a > b)",
    );
  });

  it("neutralises the one sequence that must not appear in character data", () => {
    expect(escapeXmlText("end ]]> here")).toBe("end ]]&gt; here");
  });

  it("escapes ampersands before the entities it introduces", () => {
    expect(escapeXmlText("<")).toBe("&lt;");
    expect(escapeXmlText("&lt;")).toBe("&amp;lt;");
  });
});

describe("escapeXmlAttribute", () => {
  it("also escapes both quote styles", () => {
    expect(escapeXmlAttribute(`he said "hi" & 'bye'`)).toBe(
      "he said &quot;hi&quot; &amp; &apos;bye&apos;",
    );
  });
});

describe("looksLikeMarkup", () => {
  it("detects tags, closing tags, comments and instructions", () => {
    expect(looksLikeMarkup("<div>")).toBe(true);
    expect(looksLikeMarkup("</div>")).toBe(true);
    expect(looksLikeMarkup("<!-- note -->")).toBe(true);
    expect(looksLikeMarkup("<?xml version='1.0'?>")).toBe(true);
    expect(looksLikeMarkup("<!DOCTYPE html>")).toBe(true);
  });

  it("leaves prose and arithmetic alone", () => {
    expect(looksLikeMarkup("if a < b and b > c")).toBe(false);
    expect(looksLikeMarkup("Tom & Jerry")).toBe(false);
  });
});

describe("wrapCdata", () => {
  it("wraps plain text", () => {
    expect(wrapCdata("<div/>")).toBe("<![CDATA[<div/>]]>");
  });

  it("splits around a literal ]]> so the section stays closed", () => {
    const wrapped = wrapCdata("before ]]> after");
    expect(wrapped).toBe("<![CDATA[before ]]]]><![CDATA[> after]]>");
    // The character data, concatenated across sections, is unchanged.
    const rejoined = wrapped
      .split(/<!\[CDATA\[|\]\]>/)
      .join("");
    expect(rejoined).toBe("before ]]> after");
  });
});

describe("escapeContent", () => {
  it("uses CDATA for markup and entities for prose", () => {
    expect(escapeContent("<div>hi</div>")).toBe("<![CDATA[<div>hi</div>]]>");
    expect(escapeContent("a & b")).toBe("a &amp; b");
  });

  it("honours a forced strategy", () => {
    expect(escapeContent("<div/>", { strategy: "escape" })).toBe("&lt;div/>");
    expect(escapeContent("plain", { strategy: "cdata" })).toBe("<![CDATA[plain]]>");
  });
});
