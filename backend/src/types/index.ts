export const ROLES = [
  'WASTE_PRODUCER',
  'COLLECTOR',
  'RECYCLING_ORGANIZATION',
  'ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: number;
  role: Role;
  email: string;
  name: string;
}
