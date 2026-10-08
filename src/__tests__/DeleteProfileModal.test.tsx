import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteProfileModal } from "../components/profiles/DeleteProfileModal";
import type { Profile } from "../types";

describe("DeleteProfileModal Component", () => {
  const mockProfile: Profile = {
    id: "p1",
    name: "Perfil Pessoal",
    color: "#10b981",
    codexHome: "/mock/home",
    createdAt: "2026-10-08T00:00:00Z",
    orderIndex: 0,
    isPinned: false,
  };

  it("renders profile name and deletion options", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteProfileModal
        isOpen={true}
        profile={mockProfile}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Perfil Pessoal")).toBeInTheDocument();
    expect(
      screen.getByText("Remover perfil e apagar dados locais (Recomendado)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Remover do gerenciador, mantendo dados em disco")
    ).toBeInTheDocument();
  });

  it("submits deleteData=true by default", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <DeleteProfileModal
        isOpen={true}
        profile={mockProfile}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByText("Confirmar Exclusão");
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("p1", true);
  });
});
