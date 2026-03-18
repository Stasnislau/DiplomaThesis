import "@testing-library/jest-dom";

import * as useUpdateUserRoleHook from "@/api/hooks/useUpdateUserRole";
import * as useDeleteUserHook from "@/api/hooks/useDeleteUser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserDetails } from "./UserDetails";

const mockUpdateRole = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock("@/api/hooks/useUpdateUserRole", () => ({
  useUpdateUserRole: vi.fn(),
}));

vi.mock("@/api/hooks/useDeleteUser", () => ({
  useDeleteUser: vi.fn(),
}));

const mockUser = {
  id: "user-123",
  email: "john@example.com",
  role: "USER",
  name: "John",
  surname: "Doe",
};

describe("UserDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdateUserRoleHook.useUpdateUserRole).mockReturnValue({
      updateRole: mockUpdateRole,
      isLoading: false,
      error: null,
    });

    vi.mocked(useDeleteUserHook.useDeleteUser).mockReturnValue({
      deleteUser: mockDeleteUser,
      isLoading: false,
      error: null,
    });
  });

  it("renders user info correctly", () => {
    render(<UserDetails user={mockUser} />);

    expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.surname)).toBeInTheDocument();
    expect(screen.getByText("USER")).toBeInTheDocument();
  });

  it("shows 'Make Admin' button for USER role", () => {
    render(<UserDetails user={mockUser} />);
    expect(screen.getByText("Make Admin")).toBeInTheDocument();
  });

  it("shows 'Remove Admin Role' button for ADMIN role", () => {
    const adminUser = { ...mockUser, role: "ADMIN" };
    render(<UserDetails user={adminUser} />);
    expect(screen.getByText("Remove Admin Role")).toBeInTheDocument();
  });

  it("calls updateRole with ADMIN when 'Make Admin' is clicked", async () => {
    mockUpdateRole.mockResolvedValue(true);
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Make Admin"));

    await waitFor(() => {
      expect(mockUpdateRole).toHaveBeenCalledWith({
        id: "user-123",
        role: "ADMIN",
      });
    });
  });

  it("calls updateRole with USER when 'Remove Admin Role' is clicked", async () => {
    mockUpdateRole.mockResolvedValue(true);
    const adminUser = { ...mockUser, role: "ADMIN" };
    render(<UserDetails user={adminUser} />);

    fireEvent.click(screen.getByText("Remove Admin Role"));

    await waitFor(() => {
      expect(mockUpdateRole).toHaveBeenCalledWith({
        id: "user-123",
        role: "USER",
      });
    });
  });

  it("shows success message after role change", async () => {
    mockUpdateRole.mockResolvedValue(true);
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Make Admin"));

    await waitFor(() => {
      expect(screen.getByText("Role changed to ADMIN")).toBeInTheDocument();
    });
  });

  it("shows error message when role change fails", async () => {
    mockUpdateRole.mockRejectedValue(new Error("Permission denied"));
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Make Admin"));

    await waitFor(() => {
      expect(screen.getByText("Permission denied")).toBeInTheDocument();
    });
  });

  it("requires confirmation before deleting user", () => {
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Delete User"));

    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("calls deleteUser after confirmation", async () => {
    mockDeleteUser.mockResolvedValue(true);
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Delete User"));
    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith("user-123");
    });
  });

  it("cancels deletion when Cancel is clicked", () => {
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Delete User"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.getByText("Delete User")).toBeInTheDocument();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("calls onUserDeleted callback after successful deletion", async () => {
    mockDeleteUser.mockResolvedValue(true);
    const onUserDeleted = vi.fn();
    render(<UserDetails user={mockUser} onUserDeleted={onUserDeleted} />);

    fireEvent.click(screen.getByText("Delete User"));
    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(onUserDeleted).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error message when deletion fails", async () => {
    mockDeleteUser.mockRejectedValue(new Error("Server error"));
    render(<UserDetails user={mockUser} />);

    fireEvent.click(screen.getByText("Delete User"));
    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
