import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../components/common/StatusBadge";
import type { AuthStatus } from "../types";

describe("StatusBadge Component", () => {
  it("renders connected status with provider detail", () => {
    const status: AuthStatus = { status: "logged_in", detail: "ChatGPT" };
    render(<StatusBadge status={status} />);
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
  });

  it("renders disconnected status", () => {
    const status: AuthStatus = { status: "not_logged_in" };
    render(<StatusBadge status={status} />);
    expect(screen.getByText("Desconectado")).toBeInTheDocument();
  });

  it("renders authenticating status", () => {
    const status: AuthStatus = { status: "authenticating" };
    render(<StatusBadge status={status} />);
    expect(screen.getByText("Autenticando...")).toBeInTheDocument();
  });

  it("renders error status", () => {
    const status: AuthStatus = { status: "error", detail: "Falha de rede" };
    render(<StatusBadge status={status} />);
    expect(screen.getByText("Erro")).toBeInTheDocument();
  });
});
