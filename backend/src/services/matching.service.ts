import { RowDataPacket } from 'mysql2';
import { query, queryOne } from '../config/db.mysql';
import { listingRepository, toListing, Listing } from '../repositories/listing.repository';

/**
 * SMART MATCHING (rule-based, no AI/ML)
 * ------------------------------------
 * A collector is a suitable match for a waste listing when:
 *   1. MATERIAL  - the collector accepts the listing's category
 *   2. AREA      - the collector's service area matches the listing location
 *   3. AVAILABLE - the collector is currently available
 *   4. VERIFIED  - the collector has been verified by an admin
 *
 * A numeric score is produced so the UI can rank matches:
 *   material  = 50 points (mandatory)
 *   area      = 30 points
 *   available = 20 points (mandatory)
 *   verified  = 10 bonus points
 */

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

interface CollectorRow extends RowDataPacket {
  collector_id: number;
  user_id: number;
  name: string;
  email: string;
  service_area: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  accepted_materials: string[] | string | null;
  vehicle_type: string | null;
}

function parseMaterials(value: string[] | string | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/** True when two locations refer to the same area (simple normalised compare). */
export function areaMatches(serviceArea: string, listingLocation: string): boolean {
  const a = normalise(serviceArea);
  const b = normalise(listingLocation);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function scoreCollector(row: CollectorRow, listing: Listing): MatchResult {
  const materials = parseMaterials(row.accepted_materials);
  const materialMatched = materials.some((m) => normalise(m) === normalise(listing.categoryName));
  const areaMatched = areaMatches(row.service_area, listing.location);
  const available = row.availability === 'AVAILABLE';
  const verified = row.verification_status === 'VERIFIED';

  const reasons: string[] = [];
  let score = 0;

  if (materialMatched) {
    score += 50;
    reasons.push(`Accepts ${listing.categoryName}`);
  }
  if (areaMatched) {
    score += 30;
    reasons.push(`Service area covers ${listing.location}`);
  }
  if (available) {
    score += 20;
    reasons.push('Currently available');
  } else {
    reasons.push('Currently unavailable');
  }
  if (verified) {
    score += 10;
    reasons.push('Verified collector');
  } else {
    reasons.push('Awaiting admin verification');
  }

  return {
    collectorId: row.collector_id,
    userId: row.user_id,
    collectorName: row.name,
    collectorEmail: row.email,
    serviceArea: row.service_area,
    availability: row.availability,
    verificationStatus: row.verification_status,
    acceptedMaterials: materials,
    vehicleType: row.vehicle_type,
    score,
    reasons,
    areaMatched,
  };
}

/**
 * Find suitable collectors for a listing.
 * Material type + availability are hard requirements; area match is preferred
 * but a collector outside the area is still returned with a lower score so the
 * producer keeps the final decision.
 */
export async function findMatchesForListing(
  listingId: number,
  options: { onlyAreaMatch?: boolean; limit?: number } = {}
): Promise<MatchResult[]> {
  const listingRow = await listingRepository.findById(listingId);
  if (!listingRow) return [];
  const listing = toListing(listingRow);

  const rows = await query<CollectorRow[]>(
    `SELECT cp.collector_id, cp.user_id, u.name, u.email, cp.service_area,
            cp.availability, cp.verification_status, cp.accepted_materials, cp.vehicle_type
     FROM collector_profiles cp
     JOIN users u ON u.user_id = cp.user_id
     WHERE u.is_active = 1
     ORDER BY cp.collector_id ASC`
  );

  let matches = rows
    .map((row) => scoreCollector(row, listing))
    .filter((m) => {
      const acceptsMaterial = m.acceptedMaterials.some(
        (x) => normalise(x) === normalise(listing.categoryName)
      );
      if (!acceptsMaterial) return false;
      if (m.availability !== 'AVAILABLE') return false;
      if (options.onlyAreaMatch && !m.areaMatched) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  if (options.limit) matches = matches.slice(0, options.limit);
  return matches;
}

/** Matches for a collector: available listings that fit their profile. */
export async function findMatchesForCollector(
  userId: number,
  limit = 20
): Promise<Array<Listing & { score: number; reasons: string[] }>> {
  const collector = await queryOne<CollectorRow>(
    `SELECT cp.collector_id, cp.user_id, u.name, u.email, cp.service_area,
            cp.availability, cp.verification_status, cp.accepted_materials, cp.vehicle_type
     FROM collector_profiles cp
     JOIN users u ON u.user_id = cp.user_id
     WHERE cp.user_id = ?`,
    [userId]
  );
  if (!collector) return [];

  const materials = parseMaterials(collector.accepted_materials);
  if (!materials.length) return [];

  const listings = await query<RowDataPacket[]>(
    `SELECT l.*, c.category_name, u.name AS producer_name, u.email AS producer_email
     FROM waste_listings l
     JOIN waste_categories c ON c.category_id = l.category_id
     JOIN users u ON u.user_id = l.user_id
     WHERE l.status = 'AVAILABLE' AND l.user_id <> ?
     ORDER BY l.created_at DESC
     LIMIT 200`,
    [userId]
  );

  const results: Array<Listing & { score: number; reasons: string[] }> = [];
  for (const raw of listings) {
    const listing = toListing(raw as any);
    const materialMatched = materials.some((m) => normalise(m) === normalise(listing.categoryName));
    if (!materialMatched) continue;

    const areaMatched = areaMatches(collector.service_area, listing.location);
    const reasons = [`Accepts ${listing.categoryName}`];
    let score = 50;
    if (areaMatched) {
      score += 30;
      reasons.push(`Service area covers ${listing.location}`);
    } else {
      reasons.push('Outside your stated service area');
    }
    results.push({ ...listing, score, reasons });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
