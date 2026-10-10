export type Role = 'WASTE_PRODUCER' | 'COLLECTOR' | 'RECYCLING_ORGANIZATION' | 'ADMIN';

export interface User {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  categoryId: number;
  categoryName: string;
  description: string | null;
}

export type ListingStatus = 'AVAILABLE' | 'REQUESTED' | 'SCHEDULED' | 'COLLECTED' | 'CANCELLED';

export interface MatchResult {
  collectorId: number;
  userId: number;
  collectorName: string;
  collectorEmail: string;
  serviceArea: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  acceptedMaterials: string[];
  vehicleType: string | null;
  score: number;
  reasons: string[];
  areaMatched: boolean;
}

export interface Listing {
  listingId: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  quantity: number;
  unit: string;
  location: string;
  description: string | null;
  status: ListingStatus;
  producerName: string;
  producerEmail: string;
  createdAt: string;
  updatedAt: string;
  matches?: MatchResult[];
  score?: number;
  reasons?: string[];
}

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type PickupStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface PickupRequest {
  requestId: number;
  listingId: number;
  collectorId: number;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
  listing: {
    categoryName: string;
    quantity: number;
    unit: string;
    location: string;
    status: string;
    producerId: number;
    producerName: string;
    producerEmail: string;
  };
  collector: {
    collectorId: number;
    userId: number;
    name: string;
    email: string;
  };
  pickup: {
    pickupId: number;
    scheduledDate: string;
    status: PickupStatus;
    completedAt: string | null;
  } | null;
}

export interface CollectorProfile {
  collectorId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  serviceArea: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  acceptedMaterials: string[];
  vehicleType: string | null;
  bio: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt: string | null;
}

export interface OrganizationProfile {
  orgId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string;
  address: string | null;
  acceptedMaterials: string[];
  description: string | null;
}

export interface Notification {
  _id: string;
  userId: number;
  message: string;
  type: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  actorId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | string | null;
  description: string;
  createdAt: string;
}

export interface AdminStats {
  users: { total: number; byRole: Record<string, number> };
  listings: { total: number; byStatus: Record<string, number> };
  pickupRequests: { byStatus: Record<string, number> };
  pickups: { byStatus: Record<string, number> };
  collectors: { total: number; verified: number; pending: number };
}

export interface Feedback {
  feedbackId: number;
  pickupId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}
