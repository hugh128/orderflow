import type { PackageStatus } from "./types";

const NEXT_STATUS: Record<PackageStatus, PackageStatus | null> = {
  pending: "in_progress",
  in_progress: "review",
  review: "done",
  done: null,
};

export class InvalidTransitionError extends Error {
  constructor(message = "La transición de estado no está permitida") {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export function nextStatus(status: PackageStatus): PackageStatus | null {
  return NEXT_STATUS[status];
}

export function advance(from: PackageStatus): PackageStatus {
  const next = nextStatus(from);
  if (next === null) throw new InvalidTransitionError();
  return next;
}

export function reject(from: PackageStatus): PackageStatus {
  if (from !== "review") throw new InvalidTransitionError();
  return "in_progress";
}
