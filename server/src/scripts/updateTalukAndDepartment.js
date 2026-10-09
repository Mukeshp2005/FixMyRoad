import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('server/.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const resComp = await Complaint.updateMany(
    {},
    { $set: { taluk: 'Central Taluk', zone: 'Zone 1', departmentName: 'PWD_ROADS' } }
  );
  console.log('✅ Updated complaints with taluk/department:', resComp.modifiedCount);

  const resUser = await User.updateMany(
    { role: { $in: ['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER'] } },
    { $set: { taluk: 'Central Taluk', zone: 'Zone 1', departmentName: 'PWD_ROADS' } }
  );
  console.log('✅ Updated officers with taluk/department:', resUser.modifiedCount);

  process.exit(0);
}

run().catch(console.error);
