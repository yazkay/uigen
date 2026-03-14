import { test, expect, beforeEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

// Mock sessionStorage for node environment
const store: Record<string, string> = {};
const mockSessionStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
};

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", mockSessionStorage);
  vi.clearAllMocks();
});

test("getHasAnonWork returns false when no work stored", () => {
  expect(getHasAnonWork()).toBe(false);
});

test("setHasAnonWork stores data when messages exist", () => {
  const messages = [{ role: "user", content: "hello" }];
  const fsData = { "/": {} };

  setHasAnonWork(messages, fsData);

  expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
    "uigen_has_anon_work",
    "true"
  );
  expect(getHasAnonWork()).toBe(true);
});

test("setHasAnonWork stores data when file system has more than root", () => {
  const messages: any[] = [];
  const fsData = { "/": {}, "/App.jsx": { content: "code" } };

  setHasAnonWork(messages, fsData);

  expect(mockSessionStorage.setItem).toHaveBeenCalled();
});

test("setHasAnonWork does not store when empty messages and only root", () => {
  const messages: any[] = [];
  const fsData = { "/": {} };

  setHasAnonWork(messages, fsData);

  expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
});

test("getAnonWorkData returns stored data", () => {
  const messages = [{ role: "user", content: "build a form" }];
  const fileSystemData = { "/": {}, "/App.jsx": {} };

  setHasAnonWork(messages, fileSystemData);

  const data = getAnonWorkData();
  expect(data).toEqual({ messages, fileSystemData });
});

test("getAnonWorkData returns null when no data stored", () => {
  expect(getAnonWorkData()).toBeNull();
});

test("getAnonWorkData returns null for invalid JSON", () => {
  store["uigen_anon_data"] = "not-json{{{";
  expect(getAnonWorkData()).toBeNull();
});

test("clearAnonWork removes all stored data", () => {
  setHasAnonWork([{ role: "user", content: "hi" }], { "/": {}, "/a": {} });
  clearAnonWork();

  expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
    "uigen_has_anon_work"
  );
  expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
    "uigen_anon_data"
  );
  expect(getHasAnonWork()).toBe(false);
  expect(getAnonWorkData()).toBeNull();
});
