const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('wastelink');
  const coll = db.collection('notifications');
  const docs = await coll.find({
    userId: 2,
    message: { $regex: /requested to collect your Plastic listing/i }
  }).sort({ createdAt: -1 }).limit(5).toArray();

  console.log(JSON.stringify(docs, null, 2));
  await client.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
