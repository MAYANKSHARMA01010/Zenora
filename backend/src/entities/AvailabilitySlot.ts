import { randomUUID } from "node:crypto";
import { ApiError } from "../utils/ApiError";

export interface AvailabilitySlotProps {
  id: string;
  therapistId: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  createdAt: Date;
}

export interface CreateSlotInput {
  therapistId: string;
  startTime: Date;
  endTime: Date;
}

export interface UpdateSlotInput {
  startTime?: Date;
  endTime?: Date;
}

export interface SlotResponse {
  id: string;
  therapistId: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}

export class AvailabilitySlot {
  public readonly id: string;
  public readonly therapistId: string;
  public startTime: Date;
  public endTime: Date;
  public isBooked: boolean;
  public readonly createdAt: Date;

  constructor(props: AvailabilitySlotProps) {
    this.id = props.id;
    this.therapistId = props.therapistId;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.isBooked = props.isBooked;
    this.createdAt = props.createdAt;
  }

  public static create(input: CreateSlotInput): AvailabilitySlot {
    AvailabilitySlot.validateRange(input.startTime, input.endTime);
    return new AvailabilitySlot({
      id: randomUUID(),
      therapistId: input.therapistId,
      startTime: input.startTime,
      endTime: input.endTime,
      isBooked: false,
      createdAt: new Date(),
    });
  }

  public static fromPersistence(record: any): AvailabilitySlot {
    return new AvailabilitySlot({
      id: record.id,
      therapistId: record.therapistId,
      startTime: record.startTime,
      endTime: record.endTime,
      isBooked: record.isBooked,
      createdAt: record.createdAt,
    });
  }

  public reschedule(input: UpdateSlotInput): void {
    if (this.isBooked) {
      throw ApiError.conflict("Cannot modify a booked slot");
    }
    const start = input.startTime ?? this.startTime;
    const end = input.endTime ?? this.endTime;
    AvailabilitySlot.validateRange(start, end);
    this.startTime = start;
    this.endTime = end;
  }

  public ensureDeletable(): void {
    if (this.isBooked) {
      throw ApiError.conflict("Cannot delete a booked slot");
    }
  }

  public overlaps(other: { startTime: Date; endTime: Date }): boolean {
    return this.startTime < other.endTime && other.startTime < this.endTime;
  }

  public toResponse(): SlotResponse {
    return {
      id: this.id,
      therapistId: this.therapistId,
      startTime: this.startTime,
      endTime: this.endTime,
      isBooked: this.isBooked,
    };
  }

  private static validateRange(start: Date, end: Date): void {
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ApiError.badRequest("Invalid slot times");
    }
    if (end.getTime() <= start.getTime()) {
      throw ApiError.badRequest("Slot end time must be after start time");
    }
    if (start.getTime() < Date.now() - 60_000) {
      throw ApiError.badRequest("Slot start time cannot be in the past");
    }
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 15 * 60_000) {
      throw ApiError.badRequest("Slot must be at least 15 minutes");
    }
    if (durationMs > 8 * 60 * 60_000) {
      throw ApiError.badRequest("Slot cannot exceed 8 hours");
    }
  }
}
