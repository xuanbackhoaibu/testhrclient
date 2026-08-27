import { notifications } from "@mantine/notifications";

import { ApiError } from "../../shared/api/api.types";

export function showAttendanceError(
  error: unknown,
  title: string,
  fallbackMessage: string,
): void {
  if (error instanceof ApiError && error.userNotified) return;
  const errorMessage =
    error instanceof Error ? error.message.trim() : "";
  const isTechnicalTransportError =
    error instanceof ApiError &&
    (error.errorCode === "NETWORK_ERROR" ||
      /^HTTP_\d+$/.test(error.errorCode));

  notifications.show({
    color: "red",
    title,
    message:
      errorMessage && !isTechnicalTransportError
        ? errorMessage
        : fallbackMessage,
  });
}
