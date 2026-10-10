/**
 * Development seed data for WasteLink.
 *
 * Creates:
 *   - 1 Admin
 *   - 2 Waste Producers
 *   - 2 Collectors (1 verified, 1 pending)
 *   - 1 Recycling Organization
 *   - Sample waste listings
 *
 * Run: npm run seed
 * The script is idempotent - it skips users that already exist.
 */
import bcrypt from 'bcryptjs';
import { pool, execute, queryOne } from '../config/db.mysql';
import { connectMongo, disconnectMongo } from '../config/db.mongo';
import { RowDataPacket } from 'mysql2';

const PASSWORD = 'Password123!';

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  role: 'WASTE_PRODUCER' | 'COLLECTOR' | 'RECYCLING_ORGANIZATION' | 'ADMIN';
}

const USERS: SeedUser[] = [
  { name: 'System Admin', email: 'admin@wastelink.rw', phone: '+250788000001', role: 'ADMIN' },
  { name: 'Alice Producer', email: 'alice@wastelink.rw', phone: '+250788000002', role: 'WASTE_PRODUCER' },
  { name: 'Bob Producer', email: 'bob@wastelink.rw', phone: '+250788000003', role: 'WASTE_PRODUCER' },
  { name: 'Chris Collector', email: 'chris@wastelink.rw', phone: '+250788000004', role: 'COLLECTOR' },
  { name: 'Diana Collector', email: 'diana@wastelink.rw', phone: '+250788000005', role: 'COLLECTOR' },
  { name: 'EcoRwanda Recycling', email: 'ecorwanda@wastelink.rw', phone: '+250788000006', role: 'RECYCLING_ORGANIZATION' },
];

async function ensureUser(user: SeedUser): Promise<number> {
  const existing = await queryOne<RowDataPacket & { user_id: number }>(
    'SELECT user_id FROM users WHERE email = ?',
    [user.email]
  );
  if (existing) {
    console.log(`  = user exists: ${user.email}`);
    return existing.user_id;
  }
  const hash = await bcrypt.hash(PASSWORD, 10);
  const result = await execute(
    `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
    [user.name, user.email, hash, user.phone, user.role]
  );
  console.log(`  + created user: ${user.email} (${user.role})`);
  return result.insertId;
}

async function ensureCollectorProfile(
  userId: number,
  serviceArea: string,
  materials: string[],
  verification: 'VERIFIED' | 'PENDING',
  vehicle: string
): Promise<number> {
  const existing = await queryOne<RowDataPacket & { collector_id: number }>(
    'SELECT collector_id FROM collector_profiles WHERE user_id = ?',
    [userId]
  );
  if (existing) {
    await execute(
      `UPDATE collector_profiles
       SET service_area = ?, accepted_materials = CAST(? AS JSON), verification_status = ?,
           availability = 'AVAILABLE', vehicle_type = ?,
           verified_at = CASE WHEN ? = 'VERIFIED' THEN NOW() ELSE NULL END
       WHERE user_id = ?`,
      [serviceArea, JSON.stringify(materials), verification, vehicle, verification, userId]
    );
    console.log(`  = collector profile updated for user #${userId}`);
    return existing.collector_id;
  }
  const result = await execute(
    `INSERT INTO collector_profiles
       (user_id, service_area, availability, accepted_materials, vehicle_type, verification_status, verified_at, bio)
     VALUES (?, ?, 'AVAILABLE', CAST(? AS JSON), ?, ?, CASE WHEN ? = 'VERIFIED' THEN NOW() ELSE NULL END, ?)`,
    [userId, serviceArea, JSON.stringify(materials), vehicle, verification, verification, `Experienced collector based in ${serviceArea}.`]
  );
  console.log(`  + collector profile (${verification}) for user #${userId}`);
  return result.insertId;
}

async function ensureOrgProfile(userId: number, name: string, materials: string[], address: string): Promise<void> {
  const existing = await queryOne<RowDataPacket>('SELECT org_id FROM organization_profiles WHERE user_id = ?', [userId]);
  if (existing) {
    await execute(
      `UPDATE organization_profiles SET organization_name = ?, accepted_materials = CAST(? AS JSON), address = ? WHERE user_id = ?`,
      [name, JSON.stringify(materials), address, userId]
    );
    console.log(`  = organization profile updated for user #${userId}`);
    return;
  }
  await execute(
    `INSERT INTO organization_profiles (user_id, organization_name, address, accepted_materials, description)
     VALUES (?, ?, ?, CAST(? AS JSON), ?)`,
    [userId, name, address, JSON.stringify(materials), 'Regional recycling organization accepting multiple material streams.']
  );
  console.log(`  + organization profile for user #${userId}`);
}

async function ensureListing(
  userId: number,
  categoryName: string,
  quantity: number,
  unit: string,
  location: string,
  description: string
): Promise<void> {
  const category = await queryOne<RowDataPacket & { category_id: number }>(
    'SELECT category_id FROM waste_categories WHERE category_name = ?',
    [categoryName]
  );
  if (!category) {
    console.warn(`  ! category not found: ${categoryName}`);
    return;
  }
  const existing = await queryOne<RowDataPacket>(
    'SELECT listing_id FROM waste_listings WHERE user_id = ? AND category_id = ? AND location = ?',
    [userId, category.category_id, location]
  );
  if (existing) {
    console.log(`  = listing exists: ${categoryName} @ ${location}`);
    return;
  }
  await execute(
    `INSERT INTO waste_listings (user_id, category_id, quantity, unit, location, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
    [userId, category.category_id, quantity, unit, location, description]
  );
  console.log(`  + listing: ${categoryName} ${quantity}${unit} @ ${location}`);
}

async function main() {
  console.log('\n=== WasteLink seed ===\n');
  console.log('Users:');
  const ids: Record<string, number> = {};
  for (const user of USERS) {
    ids[user.email] = await ensureUser(user);
  }

  console.log('\nCollector profiles:');
  await ensureCollectorProfile(ids['chris@wastelink.rw'], 'Kicukiro', ['Plastic', 'Paper', 'Cardboard'], 'VERIFIED', 'Pickup truck');
  await ensureCollectorProfile(ids['diana@wastelink.rw'], 'Gasabo', ['Glass', 'Metal', 'Electronic Waste'], 'PENDING', 'Van');

  console.log('\nOrganization profile:');
  await ensureOrgProfile(
    ids['ecorwanda@wastelink.rw'],
    'EcoRwanda Recycling',
    ['Glass', 'Metal', 'Electronic Waste', 'Plastic'],
    'Nyarugenge, Kigali'
  );

  console.log('\nSample listings:');
  await ensureListing(ids['alice@wastelink.rw'], 'Plastic', 10, 'kg', 'Kicukiro', 'Clean PET bottles collected from an office block.');
  await ensureListing(ids['alice@wastelink.rw'], 'Paper', 15, 'kg', 'Kicukiro', 'Office paper and old newspapers.');
  await ensureListing(ids['alice@wastelink.rw'], 'Glass', 8, 'kg', 'Kicukiro', 'Assorted glass bottles, already rinsed.');
  await ensureListing(ids['bob@wastelink.rw'], 'Metal', 25, 'kg', 'Gasabo', 'Aluminium cans from a restaurant.');
  await ensureListing(ids['bob@wastelink.rw'], 'Cardboard', 30, 'kg', 'Gasabo', 'Flattened cardboard boxes from a supermarket.');
  await ensureListing(ids['bob@wastelink.rw'], 'Electronic Waste', 5, 'pieces', 'Gasabo', 'Old laptops and cables for safe disposal.');

  console.log('\n=== Seed complete ===');
  console.log(`\nDevelopment accounts (password for all: ${PASSWORD})`);
  console.log('  ADMIN                 admin@wastelink.rw');
  console.log('  WASTE_PRODUCER        alice@wastelink.rw');
  console.log('  WASTE_PRODUCER        bob@wastelink.rw');
  console.log('  COLLECTOR (verified)  chris@wastelink.rw');
  console.log('  COLLECTOR (pending)   diana@wastelink.rw');
  console.log('  RECYCLING_ORG         ecorwanda@wastelink.rw\n');
}

main()
  .then(async () => {
    await connectMongo().catch(() => undefined);
    await disconnectMongo().catch(() => undefined);
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nSeed failed:', err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
