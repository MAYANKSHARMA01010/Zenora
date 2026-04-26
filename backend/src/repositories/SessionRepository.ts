import { DatabaseService } from "../config/database";
import { Session } from "../entities/Session";

export interface ListSessionsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export class SessionRepository {
  private async db() {
    return DatabaseService.getInstance();
  }

  public async create(session: Session): Promise<Session> {
    const db = await this.db();
    const record = await db.session.create({
      data: {
        id: session.id,
        clientId: session.clientId,
        therapistId: session.therapistId,
        slotId: session.slotId,
        status: session.status as any,
        type: session.type as any,
        scheduledAt: session.scheduledAt,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
        recordingUrl: session.recordingUrl,
        cancellationReason: session.cancellationReason,
      },
    });
    return Session.fromPersistence(record);
  }

  public async findById(id: string): Promise<Session | null> {
    const db = await this.db();
    const record = await db.session.findUnique({ where: { id } });
    return record ? Session.fromPersistence(record) : null;
  }

  public async save(session: Session): Promise<Session> {
    const db = await this.db();
    const record = await db.session.update({
      where: { id: session.id },
      data: {
        status: session.status as any,
        scheduledAt: session.scheduledAt,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
        cancellationReason: session.cancellationReason,
        updatedAt: new Date(),
      },
    });
    return Session.fromPersistence(record);
  }

  public async listForClient(
    clientId: string,
    opts: ListSessionsOptions = {},
  ): Promise<{ sessions: Session[]; total: number }> {
    return this.listByFilter({ clientId }, opts);
  }

  public async listForTherapist(
    therapistId: string,
    opts: ListSessionsOptions = {},
  ): Promise<{ sessions: Session[]; total: number }> {
    return this.listByFilter({ therapistId }, opts);
  }

  private async listByFilter(
    where: Record<string, any>,
    opts: ListSessionsOptions,
  ): Promise<{ sessions: Session[]; total: number }> {
    const db = await this.db();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const skip = (page - 1) * limit;

    const filter = {
      ...where,
      ...(opts.status ? { status: opts.status as any } : {}),
    };

    const [records, total] = await Promise.all([
      db.session.findMany({
        where: filter,
        orderBy: { scheduledAt: "desc" },
        skip,
        take: limit,
      }),
      db.session.count({ where: filter }),
    ]);

    return { sessions: records.map((r: any) => Session.fromPersistence(r)), total };
  }
}

export const sessionRepository = new SessionRepository();
