import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import connectDB from '../config/database.js';
import Complaint from '../models/Complaint.js';

const inspectDb = async () => {
  await connectDB();
  const complaints = await Complaint.find().select('complaintId status issueType description createdAt').exec();
  console.log('\n--- ALL COMPLAINTS IN DATABASE ---');
  console.log(`Total count: ${complaints.length}`);
  complaints.forEach((c) => {
    console.log(`- _id: ${c._id} | complaintId: ${c.complaintId} | Status: ${c.status} | Issue: ${c.issueType}`);
  });
  process.exit(0);
};

inspectDb();
