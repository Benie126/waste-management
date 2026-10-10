/**
 * Verifies that notifications and activity logs are being written to MongoDB.
 * Usage: npm run verify:mongo  (from backend/)  OR  node backend/scripts/verify-mongo.mjs
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wastelink';

await mongoose.connect(uri);
const db = mongoose.connection.db;

const cols = await db.listCollections().toArray();
console.log('Collections:', cols.map((c) => c.name).join(', ') || '(none)');

for (const name of ['notifications', 'activity_logs']) {
  const count = await db.collection(name).countDocuments();
  console.log(`${name}: ${count} documents`);
}

const unread = await db.collection('notifications').countDocuments({ read: false });
console.log(`unread notifications: ${unread}`);

console.log('\n--- 6 most recent notifications ---');
const recent = await db
  .collection('notifications')
  .find({})
  .sort({ createdAt: -1 })
  .limit(6)
  .toArray();
if (!recent.length) console.log('  (none)');
recent.forEach((n) =>
  console.log(`  [${n.type}] user=${n.userId} read=${n.read} :: ${n.message}`)
);

console.log('\n--- 8 most recent activity logs ---');
const logs = await db
  .collection('activity_logs')
  .find({})
  .sort({ createdAt: -1 })
  .limit(8)
  .toArray();
if (!logs.length) console.log('  (none)');
logs.forEach((l) => console.log(`  ${l.action} (${l.actorRole ?? 'SYSTEM'}) :: ${l.description}`));

await mongoose.disconnect();
