import { Role } from "../constants/roles";
import { Session, SessionType } from "../entities/Session";
import {
  SessionRepository,
  sessionRepository,
  ListSessionsOptions,
} from "../repositories/SessionRepository";
import {
  AvailabilitySlotRepository,
  availabilitySlotRepository,
} from "../repositories/AvailabilitySlotRepository";
import { TherapistRepository, therapistRepository } from "../repositories/TherapistRepository";
import { ApiError } from "../utils/ApiError";
import { DatabaseService } from "../config/database";

export interface BookSessionPayload {
  therapistId: string;
  slotId: string;
  type: SessionType;
}

export interface ReschedulePayload {
  newScheduledAt: Date;
}

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository = sessionRepository,
    private readonly slots: AvailabilitySlotRepository = availabilitySlotRepository,
    private readonly therapists: TherapistRepository = therapistRepository,
  ) {}

  public async book(userId: string, userRole: string, payload: BookSessionPayload) {
    this.ensureRole(userRole, Role.CLIENT);

    const therapist = await this.therapists.findById(payload.therapistId);
    if (!therapist || !therapist.canAcceptBookings()) {
      throw ApiError.notFound("Therapist");
    }

    const slot = await this.slots.findById(payload.slotId);
    if (!slot) throw ApiError.notFound("Availability slot");
    if (slot.therapistId !== payload.therapistId) {
      throw ApiError.badRequest("Slot does not belong to the specified therapist");
    }
    if (slot.isBooked) {
      throw ApiError.conflict("This slot is already booked");
    }

    const session = Session.create({
      clientId: userId,
      therapistId: payload.therapistId,
      slotId: payload.slotId,
      type: payload.type,
      scheduledAt: slot.startTime,
    });

    // create the session and lock the slot in a single transaction
    const db = await DatabaseService.getInstance();
    const [savedRecord] = await db.$transaction([
      db.session.create({
        data: {
          id: session.id,
          clientId: session.clientId,
          therapistId: session.therapistId,
          slotId: session.slotId,
          status: session.status as any,
          type: session.type as any,
          scheduledAt: session.scheduledAt,
        },
      }),
      db.availabilitySlot.update({
        where: { id: payload.slotId },
        data: { isBooked: true },
      }),
    ]);

    return { session: Session.fromPersistence(savedRecord).toResponse() };
  }

  public async confirm(userId: string, userRole: string, sessionId: string) {
    this.ensureRole(userRole, Role.THERAPIST);
    const session = await this.getSessionOrFail(sessionId);
    if (!session.isOwnedByTherapist(userId)) throw ApiError.forbidden();

    session.confirm();
    const saved = await this.sessions.save(session);
    return { session: saved.toResponse() };
  }

  public async start(userId: string, userRole: string, sessionId: string) {
    this.ensureRole(userRole, Role.THERAPIST);
    const session = await this.getSessionOrFail(sessionId);
    if (!session.isOwnedByTherapist(userId)) throw ApiError.forbidden();

    session.start();
    const saved = await this.sessions.save(session);
    return { session: saved.toResponse() };
  }

  public async complete(userId: string, userRole: string, sessionId: string) {
    this.ensureRole(userRole, Role.THERAPIST);
    const session = await this.getSessionOrFail(sessionId);
    if (!session.isOwnedByTherapist(userId)) throw ApiError.forbidden();

    session.complete();
    const saved = await this.sessions.save(session);
    return { session: saved.toResponse() };
  }

  public async cancel(userId: string, userRole: string, sessionId: string, reason: string) {
    const session = await this.getSessionOrFail(sessionId);
    const isClient = userRole === Role.CLIENT && session.isOwnedByClient(userId);
    const isTherapist = userRole === Role.THERAPIST && session.isOwnedByTherapist(userId);
    if (!isClient && !isTherapist) throw ApiError.forbidden();

    session.cancel(reason);

    // free the slot so it can be rebooked
    const db = await DatabaseService.getInstance();
    const [savedRecord] = await db.$transaction([
      db.session.update({
        where: { id: session.id },
        data: {
          status: session.status as any,
          cancellationReason: session.cancellationReason,
          updatedAt: new Date(),
        },
      }),
      db.availabilitySlot.update({
        where: { id: session.slotId },
        data: { isBooked: false },
      }),
    ]);

    return { session: Session.fromPersistence(savedRecord).toResponse() };
  }

  public async reschedule(
    userId: string,
    userRole: string,
    sessionId: string,
    payload: ReschedulePayload,
  ) {
    this.ensureRole(userRole, Role.CLIENT);
    const session = await this.getSessionOrFail(sessionId);
    if (!session.isOwnedByClient(userId)) throw ApiError.forbidden();

    session.reschedule(payload.newScheduledAt);
    const saved = await this.sessions.save(session);
    return { session: saved.toResponse() };
  }

  public async addNotes(userId: string, userRole: string, sessionId: string, notes: string) {
    this.ensureRole(userRole, Role.THERAPIST);
    const session = await this.getSessionOrFail(sessionId);
    if (!session.isOwnedByTherapist(userId)) throw ApiError.forbidden();

    session.setNotes(notes);
    const saved = await this.sessions.save(session);
    return { session: saved.toResponse() };
  }

  public async getNotes(userId: string, userRole: string, sessionId: string) {
    const session = await this.getSessionOrFail(sessionId);
    const allowed =
      (userRole === Role.CLIENT && session.isOwnedByClient(userId)) ||
      (userRole === Role.THERAPIST && session.isOwnedByTherapist(userId));
    if (!allowed) throw ApiError.forbidden();

    return { notes: session.notes ?? "", sessionId: session.id };
  }

  public async getHistory(userId: string, userRole: string, opts: ListSessionsOptions) {
    if (userRole === Role.CLIENT) {
      const result = await this.sessions.listForClient(userId, opts);
      return { sessions: result.sessions.map((s) => s.toResponse()), total: result.total };
    }
    if (userRole === Role.THERAPIST) {
      const result = await this.sessions.listForTherapist(userId, opts);
      return { sessions: result.sessions.map((s) => s.toResponse()), total: result.total };
    }
    throw ApiError.forbidden();
  }

  public async getById(userId: string, userRole: string, sessionId: string) {
    const session = await this.getSessionOrFail(sessionId);
    const allowed =
      (userRole === Role.CLIENT && session.isOwnedByClient(userId)) ||
      (userRole === Role.THERAPIST && session.isOwnedByTherapist(userId)) ||
      userRole === Role.ADMIN;
    if (!allowed) throw ApiError.forbidden();

    return { session: session.toResponse() };
  }

  private async getSessionOrFail(id: string): Promise<Session> {
    const session = await this.sessions.findById(id);
    if (!session) throw ApiError.notFound("Session");
    return session;
  }

  private ensureRole(userRole: string, required: Role): void {
    if (userRole !== required) {
      throw ApiError.forbidden(`Only ${required.toLowerCase()}s can perform this action`);
    }
  }
}

export const sessionService = new SessionService();
