import { apiFetchOrThrow } from "@/lib/api-client";

export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await apiFetchOrThrow<{ success: boolean }>("/api/account/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changeUserPassword(
  userId: string,
  input: { newPassword: string; confirmPassword: string }
): Promise<void> {
  await apiFetchOrThrow<{ success: boolean }>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "change_password",
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    }),
  });
}
