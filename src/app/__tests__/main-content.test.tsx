import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock child components
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

// Mock providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock resizable components (rely on DOM measurements not available in jsdom)
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("MainContent toggle buttons", () => {
  test("shows preview view by default", () => {
    render(<MainContent />);
    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
  });

  test("Preview tab is active by default", () => {
    render(<MainContent />);
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    expect(previewTab).toHaveAttribute("aria-selected", "true");
    const codeTab = screen.getByRole("tab", { name: "Code" });
    expect(codeTab).toHaveAttribute("aria-selected", "false");
  });

  test("clicking Code tab switches to code view", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
    expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
  });

  test("clicking Code tab makes it active", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    expect(codeTab).toHaveAttribute("aria-selected", "true");
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    expect(previewTab).toHaveAttribute("aria-selected", "false");
  });

  test("clicking Preview tab after Code tab switches back to preview view", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Switch to code
    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();

    // Switch back to preview
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    await user.click(previewTab);

    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  });

  test("toggle buttons can be clicked multiple times", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    const previewTab = screen.getByRole("tab", { name: "Preview" });

    // Toggle multiple times
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();

    await user.click(previewTab);
    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();

    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();

    await user.click(previewTab);
    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  });
});
