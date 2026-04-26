import { ApiError } from "../utils/ApiError";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DocumentType =
  | "LICENSE"
  | "ID_PROOF"
  | "DEGREE"
  | "CERTIFICATE"
  | "OTHER";

export interface TherapistProps {
  id: string;
  licenseNumber: string;
  specialization: string;
  languages: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  rating: number;
  totalRatings: number;
  workingHours: unknown;
  bio: string | null;
  experience: number;
  hourlyRate: number | null;
  bankAccountInfo: unknown;
}

export interface CreateTherapistInput {
  userId: string;
  licenseNumber: string;
  specialization: string;
  experience: number;
  workingHours: unknown;
  languages?: string[];
  bio?: string | null;
  hourlyRate?: number | null;
  bankAccountInfo?: unknown;
}

export interface UpdateTherapistInput {
  specialization?: string;
  experience?: number;
  workingHours?: unknown;
  languages?: string[];
  bio?: string | null;
  hourlyRate?: number | null;
  bankAccountInfo?: unknown;
}

export interface TherapistResponse {
  id: string;
  licenseNumber: string;
  specialization: string;
  languages: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  rating: number;
  totalRatings: number;
  workingHours: unknown;
  bio: string | null;
  experience: number;
  hourlyRate: number | null;
}

export interface TherapistPersistencePayload {
  id: string;
  licenseNumber: string;
  specialization: string;
  languages: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  workingHours: unknown;
  bio: string | null;
  experience: number;
  hourlyRate: number | null;
  bankAccountInfo: unknown;
}

export class Therapist {
  public readonly id: string;
  public licenseNumber: string;
  public specialization: string;
  public languages: string[];
  public isVerified: boolean;
  public verificationStatus: VerificationStatus;
  public rejectionReason: string | null;
  public verifiedAt: Date | null;
  public rating: number;
  public totalRatings: number;
  public workingHours: unknown;
  public bio: string | null;
  public experience: number;
  public hourlyRate: number | null;
  public bankAccountInfo: unknown;

  constructor(props: TherapistProps) {
    this.id = props.id;
    this.licenseNumber = props.licenseNumber;
    this.specialization = props.specialization;
    this.languages = props.languages;
    this.isVerified = props.isVerified;
    this.verificationStatus = props.verificationStatus;
    this.rejectionReason = props.rejectionReason;
    this.verifiedAt = props.verifiedAt;
    this.rating = props.rating;
    this.totalRatings = props.totalRatings;
    this.workingHours = props.workingHours;
    this.bio = props.bio;
    this.experience = props.experience;
    this.hourlyRate = props.hourlyRate;
    this.bankAccountInfo = props.bankAccountInfo;
  }

  public static create(input: CreateTherapistInput): Therapist {
    return new Therapist({
      id: input.userId,
      licenseNumber: input.licenseNumber.trim(),
      specialization: input.specialization.trim(),
      languages: (input.languages ?? []).map((l) => l.trim().toLowerCase()),
      isVerified: false,
      verificationStatus: "PENDING",
      rejectionReason: null,
      verifiedAt: null,
      rating: 0,
      totalRatings: 0,
      workingHours: input.workingHours,
      bio: input.bio?.trim() ?? null,
      experience: input.experience,
      hourlyRate: input.hourlyRate ?? null,
      bankAccountInfo: input.bankAccountInfo ?? null,
    });
  }

  public static fromPersistence(record: any): Therapist {
    return new Therapist({
      id: record.id,
      licenseNumber: record.licenseNumber,
      specialization: record.specialization,
      languages: record.languages ?? [],
      isVerified: record.isVerified,
      verificationStatus: record.verificationStatus,
      rejectionReason: record.rejectionReason,
      verifiedAt: record.verifiedAt,
      rating: record.rating,
      totalRatings: record.totalRatings,
      workingHours: record.workingHours,
      bio: record.bio,
      experience: record.experience,
      hourlyRate: record.hourlyRate,
      bankAccountInfo: record.bankAccountInfo,
    });
  }

  public updateProfile(input: UpdateTherapistInput): void {
    if (input.specialization !== undefined) this.specialization = input.specialization.trim();
    if (input.experience !== undefined) this.experience = input.experience;
    if (input.workingHours !== undefined) this.workingHours = input.workingHours;
    if (input.languages !== undefined) {
      this.languages = input.languages.map((l) => l.trim().toLowerCase());
    }
    if (input.bio !== undefined) this.bio = input.bio?.trim() ?? null;
    if (input.hourlyRate !== undefined) this.hourlyRate = input.hourlyRate;
    if (input.bankAccountInfo !== undefined) this.bankAccountInfo = input.bankAccountInfo;

    if (this.verificationStatus === "REJECTED") {
      this.verificationStatus = "PENDING";
      this.rejectionReason = null;
    }
  }

  public approve(): void {
    if (this.verificationStatus === "APPROVED") {
      throw ApiError.conflict("Therapist is already approved");
    }
    this.verificationStatus = "APPROVED";
    this.isVerified = true;
    this.verifiedAt = new Date();
    this.rejectionReason = null;
  }

  public reject(reason: string): void {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw ApiError.badRequest("Rejection reason is required");
    }
    if (this.verificationStatus === "REJECTED") {
      throw ApiError.conflict("Therapist is already rejected");
    }
    this.verificationStatus = "REJECTED";
    this.isVerified = false;
    this.verifiedAt = null;
    this.rejectionReason = trimmed;
  }

  public canAcceptBookings(): boolean {
    return this.verificationStatus === "APPROVED" && this.isVerified;
  }

  public toResponse(): TherapistResponse {
    return {
      id: this.id,
      licenseNumber: this.licenseNumber,
      specialization: this.specialization,
      languages: this.languages,
      isVerified: this.isVerified,
      verificationStatus: this.verificationStatus,
      rejectionReason: this.rejectionReason,
      verifiedAt: this.verifiedAt,
      rating: this.rating,
      totalRatings: this.totalRatings,
      workingHours: this.workingHours,
      bio: this.bio,
      experience: this.experience,
      hourlyRate: this.hourlyRate,
    };
  }

  public toPersistence(): TherapistPersistencePayload {
    return {
      id: this.id,
      licenseNumber: this.licenseNumber,
      specialization: this.specialization,
      languages: this.languages,
      isVerified: this.isVerified,
      verificationStatus: this.verificationStatus,
      rejectionReason: this.rejectionReason,
      verifiedAt: this.verifiedAt,
      workingHours: this.workingHours,
      bio: this.bio,
      experience: this.experience,
      hourlyRate: this.hourlyRate,
      bankAccountInfo: this.bankAccountInfo,
    };
  }
}
