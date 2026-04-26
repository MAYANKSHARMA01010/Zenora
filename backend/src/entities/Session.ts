import { randomUUID } from "node:crypto";
import { ApiError } from "../utils/ApiError";

export type SessionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type SessionType = "VIDEO" | "VOICE" | "CHAT";

export interface SessionProps {
  id: string;
  clientId: string;
  therapistId: string;
  slotId: string;
  status: SessionStatus;
  type: SessionType;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  notes: string | null;
  recordingUrl: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  clientId: string;
  therapistId: string;
  slotId: string;
  type: SessionType;
  scheduledAt: Date;
}

export interface SessionResponse {
  id: string;
  clientId: string;
  therapistId: string;
  slotId: string;
  status: SessionStatus;
  type: SessionType;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "RESCHEDULED"],
  CONFIRMED: ["ONGOING", "CANCELLED", "RESCHEDULED"],
  ONGOING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  RESCHEDULED: ["CONFIRMED", "CANCELLED"],
};

export class Session {
  public readonly id: string;
  public readonly clientId: string;
  public readonly therapistId: string;
  public readonly slotId: string;
  public status: SessionStatus;
  public readonly type: SessionType;
  public scheduledAt: Date;
  public startedAt: Date | null;
  public endedAt: Date | null;
  public notes: string | null;
  public readonly recordingUrl: string | null;
  public cancellationReason: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: SessionProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.therapistId = props.therapistId;
    this.slotId = props.slotId;
    this.status = props.status;
    this.type = props.type;
    this.scheduledAt = props.scheduledAt;
    this.startedAt = props.startedAt;
    this.endedAt = props.endedAt;
    this.notes = props.notes;
    this.recordingUrl = props.recordingUrl;
    this.cancellationReason = props.cancellationReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(input: CreateSessionInput): Session {
    if (input.scheduledAt < new Date()) {
      throw ApiError.badRequest("Session cannot be scheduled in the past");
    }
    return new Session({
      id: randomUUID(),
      clientId: input.clientId,
      therapistId: input.therapistId,
      slotId: input.slotId,
      status: "PENDING",
      type: input.type,
      scheduledAt: input.scheduledAt,
      startedAt: null,
      endedAt: null,
      notes: null,
      recordingUrl: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static fromPersistence(record: any): Session {
    return new Session({
      id: record.id,
      clientId: record.clientId,
      therapistId: record.therapistId,
      slotId: record.slotId ?? "",
      status: record.status as SessionStatus,
      type: record.type as SessionType,
      scheduledAt: record.scheduledAt,
      startedAt: record.startedAt ?? null,
      endedAt: record.endedAt ?? null,
      notes: record.notes ?? null,
      recordingUrl: record.recordingUrl ?? null,
      cancellationReason: record.cancellationReason ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  public confirm(): void {
    this.transition("CONFIRMED");
  }

  public start(): void {
    this.transition("ONGOING");
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  public complete(): void {
    this.transition("COMPLETED");
    this.endedAt = new Date();
    this.updatedAt = new Date();
  }

  public cancel(reason: string): void {
    this.transition("CANCELLED");
    this.cancellationReason = reason;
    this.updatedAt = new Date();
  }

  public reschedule(newTime: Date): void {
    if (newTime < new Date()) {
      throw ApiError.badRequest("Rescheduled time must be in the future");
    }
    this.transition("RESCHEDULED");
    this.scheduledAt = newTime;
    this.updatedAt = new Date();
  }

  // notes can only be written during or after the session
  public setNotes(content: string): void {
    if (this.status !== "ONGOING" && this.status !== "COMPLETED") {
      throw ApiError.badRequest("Notes can only be added during or after a session");
    }
    this.notes = content;
    this.updatedAt = new Date();
  }

  public isOwnedByClient(clientId: string): boolean {
    return this.clientId === clientId;
  }

  public isOwnedByTherapist(therapistId: string): boolean {
    return this.therapistId === therapistId;
  }

  public canChat(): boolean {
    return this.status === "CONFIRMED" || this.status === "ONGOING";
  }

  public toResponse(): SessionResponse {
    return {
      id: this.id,
      clientId: this.clientId,
      therapistId: this.therapistId,
      slotId: this.slotId,
      status: this.status,
      type: this.type,
      scheduledAt: this.scheduledAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      notes: this.notes,
      cancellationReason: this.cancellationReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private transition(to: SessionStatus): void {
    const allowed = VALID_TRANSITIONS[this.status];
    if (!allowed.includes(to)) {
      throw ApiError.badRequest(
        `Cannot move session from ${this.status} to ${to}`,
      );
    }
    this.status = to;
    this.updatedAt = new Date();
  }
}
