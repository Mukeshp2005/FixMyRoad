import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import connectDB from '../config/database.js';

import '../models/User.js';
import '../models/Municipality.js';
import '../models/HierarchyLevel.js';
import Complaint from '../models/Complaint.js';

const testDetails = async () => {
  await connectDB();
  try {
    const complaintIdParam = 'FMR-2026-00010';
    const query = { $or: [{ complaintId: complaintIdParam }] };

    console.log('Querying complaint:', complaintIdParam);
    const complaint = await Complaint.findOne(query)
      .populate('citizenId', 'name email phone')
      .populate('assignedTo', 'name email role phone')
      .populate('municipalityId', 'name code state district contactEmail contactPhone notificationMethod apiEndpoint')
      .populate('currentHierarchyLevelId', 'levelName levelOrder escalationSlaDays')
      .exec();

    console.log('✅ Successfully found complaint:', complaint ? complaint.complaintId : 'NULL');
    if (complaint) {
      console.log('- Status:', complaint.status);
      console.log('- Address:', complaint.address);
      console.log('- Citizen:', complaint.citizenId?.name || 'Unlinked');
    }
  } catch (err) {
    console.error('Error finding complaint:', err);
  }
  process.exit(0);
};

testDetails();
