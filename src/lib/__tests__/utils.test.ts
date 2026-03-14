import { test, expect } from "vitest";
import { cn } from "@/lib/utils";

test("merges class names", () => {
  expect(cn("foo", "bar")).toBe("foo bar");
});

test("handles conditional classes", () => {
  expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  expect(cn("base", true && "active")).toBe("base active");
});

test("handles undefined and null inputs", () => {
  expect(cn("base", undefined, null, "end")).toBe("base end");
});

test("handles empty inputs", () => {
  expect(cn()).toBe("");
  expect(cn("")).toBe("");
});

test("merges conflicting Tailwind classes (last wins)", () => {
  expect(cn("p-4", "p-2")).toBe("p-2");
  expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  expect(cn("bg-white", "bg-black")).toBe("bg-black");
});

test("handles arrays of class names", () => {
  expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
});

test("handles objects for conditional classes", () => {
  expect(cn({ active: true, disabled: false })).toBe("active");
  expect(cn("base", { "font-bold": true, hidden: false })).toBe(
    "base font-bold"
  );
});
