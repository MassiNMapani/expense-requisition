import { connectDatabase } from '../lib/db';
import { PurchaseRequestModel } from '../models/PurchaseRequest';
import { CounterModel } from '../models/Counter';

async function getNextSequence(name: string) {
  const doc = await CounterModel.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true }).exec();
  return doc.seq;
}

async function migrate() {
  await connectDatabase();
  const requests = await PurchaseRequestModel.find({});
  for (const req of requests) {
    const hasNumeric = /PR-\d+$/.test(req.requestNumber);
    if (!hasNumeric) {
      const seq = await getNextSequence('purchaseRequest');
      const newNumber = `PR-${String(seq).padStart(6, '0')}`;
      // update only the requestNumber field to avoid running full document validation
      await PurchaseRequestModel.updateOne({ _id: req._id }, { $set: { requestNumber: newNumber } }).exec();
      console.log('Updated', req._id.toString(), newNumber);
    }
  }
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
