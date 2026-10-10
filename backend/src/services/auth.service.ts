import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { userRepository, toPublicUser, PublicUser } from '../repositories/user.repository';
import { signToken } from '../middleware/auth.middleware';
import { Role, ROLES } from '../types';
import { eventBus, EVENT } from '../config/rabbitmq';
import { logActivity } from './activityLog.service';
import { execute } from '../config/db.mysql';

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: PublicUser;
}

function tokenFor(user: { user_id: number; role: Role; email: string; name: string }): string {
  return signToken({ sub: user.user_id, role: user.role, email: user.email, name: user.name });
}

/** Creates the role-specific profile row right after registration. */
async function createRoleProfile(userId: number, role: Role, name: string): Promise<void> {
  if (role === 'COLLECTOR') {
    await execute(
      `INSERT INTO collector_profiles (user_id, service_area, availability, accepted_materials, verification_status)
       VALUES (?, ?, 'AVAILABLE', JSON_ARRAY(), 'PENDING')`,
      [userId, '']
    );
  } else if (role === 'RECYCLING_ORGANIZATION') {
    await execute(
      `INSERT INTO organization_profiles (user_id, organization_name, accepted_materials)
       VALUES (?, ?, JSON_ARRAY())`,
      [userId, name]
    );
  }
}

export const authService = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: Role;
  }): Promise<AuthResult> {
    if (!ROLES.includes(input.role)) throw ApiError.badRequest('Invalid role');
    if (input.role === 'ADMIN') throw ApiError.forbidden('Admin accounts cannot be self-registered');

    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);
    const userId = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashed,
      phone: input.phone ?? null,
      role: input.role,
    });

    await createRoleProfile(userId, input.role, input.name);

    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(500, 'Failed to load created user');

    await eventBus.publish(EVENT.USER_REGISTERED, { userId, role: input.role });
    await logActivity({
      actorId: userId,
      actorRole: input.role,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: userId,
      description: `${input.name} registered as ${input.role}`,
    });

    return { token: tokenFor(user), user: toPublicUser(user) };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await userRepository.findByEmail(email);
    // Deliberately identical message for unknown email and wrong password.
    if (!user || !user.password) throw ApiError.unauthorized('Invalid email or password');
    if (!user.is_active) throw ApiError.forbidden('Your account has been deactivated');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    await logActivity({
      actorId: user.user_id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.user_id,
      description: `${user.email} logged in`,
    });

    return { token: tokenFor(user), user: toPublicUser(user) };
  },

  /**
   * Google OAuth2. The frontend obtains an ID token with Google Identity
   * Services and posts it here; we verify it against Google's public keys.
   */
  async loginWithGoogle(idToken: string, requestedRole?: Role): Promise<AuthResult> {
    if (!env.google.clientId) {
      throw ApiError.badRequest('Google OAuth is not configured on the server');
    }
    const client = new OAuth2Client(env.google.clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: env.google.clientId });
      payload = ticket.getPayload();
    } catch {
      throw ApiError.unauthorized('Invalid Google token');
    }
    if (!payload?.email) throw ApiError.unauthorized('Google account has no email');

    let user = await userRepository.findByGoogleId(payload.sub);
    if (!user) user = await userRepository.findByEmail(payload.email);

    if (!user) {
      const role: Role = requestedRole && requestedRole !== 'ADMIN' ? requestedRole : 'WASTE_PRODUCER';
      const userId = await userRepository.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        password: null,
        role,
        googleId: payload.sub,
        avatarUrl: payload.picture ?? null,
      });
      await createRoleProfile(userId, role, payload.name || 'Organization');
      user = await userRepository.findById(userId);
      if (!user) throw new ApiError(500, 'Failed to create Google user');
      await eventBus.publish(EVENT.USER_REGISTERED, { userId, role });
    } else if (!user.google_id) {
      // Link the Google account to the existing email/password account.
      await execute('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE user_id = ?', [
        payload.sub,
        payload.picture ?? null,
        user.user_id,
      ]);
      user = await userRepository.findById(user.user_id);
      if (!user) throw ApiError.unauthorized('Account not found');
    }

    if (!user.is_active) throw ApiError.forbidden('Your account has been deactivated');

    await logActivity({
      actorId: user.user_id,
      actorRole: user.role,
      action: 'USER_LOGIN_GOOGLE',
      entityType: 'user',
      entityId: user.user_id,
      description: `${user.email} logged in with Google`,
    });

    return { token: tokenFor(user), user: toPublicUser(user) };
  },

  async me(userId: number): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async updateProfile(
    userId: number,
    input: { name?: string; phone?: string; password?: string }
  ): Promise<PublicUser> {
    const update: { name?: string; phone?: string | null; password?: string } = {};
    if (input.name) update.name = input.name;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.password) update.password = await bcrypt.hash(input.password, SALT_ROUNDS);

    await userRepository.updateProfile(userId, update);
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    await logActivity({
      actorId: userId,
      actorRole: user.role,
      action: 'PROFILE_UPDATED',
      entityType: 'user',
      entityId: userId,
      description: 'Profile updated',
    });

    return toPublicUser(user);
  },
};
