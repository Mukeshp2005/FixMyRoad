import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { changeComplaintStatusWithTransaction } from './complaintStatusService.js';

/**
 * Retrieves aggregate complaint statistics across all complaints for officer view.
 */
export const getMunicipalityStats = async (municipalityId) => {
  const stats = await Complaint.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        submitted: { $sum: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, 1, 0] } },
        underReview: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'ACCEPTED'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] } },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      total: 0,
      submitted: 0,
      underReview: 0,
      accepted: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      rejected: 0,
      critical: 0,
      high: 0,
    };
  }

  const res = stats[0];
  delete res._id;
  return res;
};

/**
 * Retrieves paginated complaints for officer dashboard with whitelisted filters.
 */
export const getMunicipalityComplaints = async ({
  municipalityId,
  page = 1,
  limit = 10,
  status,
  severity,
  issueType,
  search,
  sort = 'newest',
  from,
  to,
}) => {
  const query = {};

  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (issueType) query.issueType = issueType;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const cleanSearch = search.trim();
    query.$or = [
      { complaintId: { $regex: cleanSearch, $options: 'i' } },
      { address: { $regex: cleanSearch, $options: 'i' } },
      { description: { $regex: cleanSearch, $options: 'i' } },
      { issueType: { $regex: cleanSearch, $options: 'i' } },
      { taluk: { $regex: cleanSearch, $options: 'i' } },
      { zone: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') sortOption = { createdAt: 1 };
  if (sort === 'severity') sortOption = { severity: -1, createdAt: -1 };
  if (sort === 'updated') sortOption = { updatedAt: -1 };

  const [complaints, totalRecords] = await Promise.all([
    Complaint.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate('citizenId', 'name email phone')
      .populate('assignedTo', 'name email role phone')
      .populate('municipalityId', 'name code state district')
      .populate('currentHierarchyLevelId', 'levelName levelOrder escalationSlaDays')
      .exec(),
    Complaint.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalRecords / limitNum);

  return {
    complaints,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalRecords,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

export const getMunicipalityOfficers = async (municipalityId) => {
  const query = {
    role: { $in: ['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER'] },
    isActive: true,
  };

  const officers = await User.find(query).select('name email role phone municipalityId').exec();
  return officers;
};

export const assignComplaintToOfficer = async ({ complaintId, assignedTo, comment, updatedBy }) => {
  const complaint = await Complaint.findOne({ complaintId });

  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }

  const targetOfficer = await User.findById(assignedTo);
  if (!targetOfficer || !['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER'].includes(targetOfficer.role)) {
    const error = new Error('Invalid officer assignedTo ID.');
    error.statusCode = 400;
    throw error;
  }

  const updatedComplaint = await changeComplaintStatusWithTransaction({
    complaint,
    targetStatus: 'ASSIGNED',
    comment: comment || `Assigned complaint to officer ${targetOfficer.name}`,
    assignedTo: targetOfficer._id,
    updatedBy,
  });

  return updatedComplaint;
};
