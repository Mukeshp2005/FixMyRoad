import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import ReopenRequest from '../models/ReopenRequest.js';
import Municipality from '../models/Municipality.js';
import AuditLog from '../models/AuditLog.js';
import { changeComplaintStatusWithTransaction } from './complaintStatusService.js';
import { createInAppNotification } from './notificationService.js';
import { createMunicipalityOutboxEvents } from './notification/notificationService.js';

/**
 * Creates a citizen reopen request while complaint status remains RESOLVED (status = PENDING).
 * Allows new request if previous request was REJECTED, but blocks if PENDING or ACCEPTED for that cycle.
 */
export const createReopenRequestWithTransaction = async ({ complaintIdParam, reason, imageUrl = null, user }) => {
  const query = mongoose.isValidObjectId(complaintIdParam)
    ? { $or: [{ _id: complaintIdParam }, { complaintId: complaintIdParam }] }
    : { complaintId: complaintIdParam };

  const complaint = await Complaint.findOne(query);

  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }

  // 1. Citizen Ownership Check
  if (complaint.citizenId.toString() !== user._id.toString()) {
    const error = new Error('Access denied: You can only request reopening for your own reported complaints');
    error.statusCode = 403;
    throw error;
  }

  // 2. Status Check (Allows RESOLVED or REJECTED for citizen dispute)
  if (!['RESOLVED', 'REJECTED'].includes(complaint.status)) {
    const error = new Error(`Reopen/dispute requests can only be submitted for RESOLVED or REJECTED complaints (Current status: ${complaint.status})`);
    error.statusCode = 400;
    error.code = 'COMPLAINT_NOT_REOPENABLE';
    throw error;
  }

  // 3. Reason Check
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    const error = new Error('A detailed reason is required to request reopening');
    error.statusCode = 400;
    error.code = 'REASON_REQUIRED';
    throw error;
  }

  const currentCycle = complaint.resolutionCycle || 1;

  // 4. Duplicate Check Rule: Block if PENDING or ACCEPTED in current cycle. Allow if REJECTED.
  const activeReopen = await ReopenRequest.findOne({
    complaintId: complaint._id,
    resolutionCycle: currentCycle,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  });

  if (activeReopen) {
    if (activeReopen.status === 'PENDING') {
      const error = new Error('A reopen request is already pending review for this complaint');
      error.statusCode = 409;
      error.code = 'REOPEN_REQUEST_ALREADY_PENDING';
      throw error;
    } else if (activeReopen.status === 'ACCEPTED') {
      const error = new Error('A reopen request has already been accepted for this resolution cycle');
      error.statusCode = 409;
      error.code = 'REOPEN_REQUEST_ALREADY_ACCEPTED';
      throw error;
    }
  }

  const sanitizedReason = reason.trim().substring(0, 1000);

  // 5. Create ReopenRequest Document (status = PENDING, complaint status remains RESOLVED)
  const reopenDoc = await ReopenRequest.create({
    complaintId: complaint._id,
    citizenId: user._id,
    municipalityId: complaint.municipalityId,
    resolutionCycle: currentCycle,
    reason: sanitizedReason,
    imageUrl: imageUrl || null,
    status: 'PENDING',
  });

  // 6. Create AuditLog & Outbox Alert for Municipality
  await AuditLog.create({
    action: 'COMPLAINT_REOPEN_REQUESTED',
    entity: 'Complaint',
    entityId: complaint._id,
    actor: user._id,
    metadata: {
      complaintId: complaint.complaintId,
      reopenRequestId: reopenDoc._id,
      reason: sanitizedReason,
    },
  });

  const municipality = await Municipality.findById(complaint.municipalityId);
  if (municipality) {
    await createMunicipalityOutboxEvents({
      complaint,
      municipality,
    });
  }

  return {
    reopenRequest: reopenDoc,
    complaint,
  };
};

/**
 * Retrieves paginated reopen requests for a municipality.
 */
export const getMunicipalityReopenRequests = async ({ municipalityId, page = 1, limit = 10, status }) => {
  const query = {};
  if (municipalityId) query.municipalityId = municipalityId;
  if (status) query.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const total = await ReopenRequest.countDocuments(query);
  const reopenRequests = await ReopenRequest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('complaintId', 'complaintId issueType severity status imageUrl resolutionImage resolutionComment address')
    .populate('citizenId', 'name email phone')
    .populate('municipalityId', 'name code district')
    .exec();

  return {
    reopenRequests,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Reviews a pending reopen request (ACCEPT moves complaint RESOLVED -> UNDER_REVIEW; REJECT keeps complaint RESOLVED).
 */
export const reviewReopenRequest = async ({ reopenRequestId, action, reviewComment = '', user }) => {
  const reopenDoc = await ReopenRequest.findById(reopenRequestId).populate('complaintId');

  if (!reopenDoc) {
    const error = new Error('Reopen request not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant Access Check
  if (user.role !== 'SUPER_ADMIN') {
    const adminMunId = user.municipalityId ? user.municipalityId.toString() : null;
    const requestMunId = reopenDoc.municipalityId ? reopenDoc.municipalityId.toString() : null;

    if (!adminMunId || adminMunId !== requestMunId) {
      const error = new Error('Access denied: You can only review reopen requests for your assigned municipality');
      error.statusCode = 403;
      throw error;
    }
  }

  if (reopenDoc.status !== 'PENDING') {
    const error = new Error(`Reopen request has already been reviewed (Current status: ${reopenDoc.status})`);
    error.statusCode = 400;
    error.code = 'ALREADY_REVIEWED';
    throw error;
  }

  const cleanComment = reviewComment && typeof reviewComment === 'string' ? reviewComment.trim() : '';

  if (action === 'REJECT' && !cleanComment) {
    const error = new Error('A review comment is required when rejecting a citizen reopen request');
    error.statusCode = 400;
    error.code = 'REVIEW_COMMENT_REQUIRED';
    throw error;
  }

  const complaint = reopenDoc.complaintId;

  if (action === 'ACCEPT') {
    reopenDoc.status = 'ACCEPTED';
    reopenDoc.reviewedBy = user._id;
    reopenDoc.reviewComment = cleanComment || 'Reopen request accepted by municipal admin';
    await reopenDoc.save();

    // Transition complaint RESOLVED -> UNDER_REVIEW
    const updatedComplaint = await changeComplaintStatusWithTransaction({
      complaint,
      targetStatus: 'UNDER_REVIEW',
      comment: `Citizen reopen request accepted. ${cleanComment}`,
      updatedBy: user._id,
    });

    await AuditLog.create({
      action: 'REOPEN_REQUEST_ACCEPTED',
      entity: 'ReopenRequest',
      entityId: reopenDoc._id,
      actor: user._id,
      metadata: {
        complaintId: complaint.complaintId,
        reopenRequestId: reopenDoc._id,
      },
    });

    await createInAppNotification({
      userId: complaint.citizenId,
      type: 'COMPLAINT_STATUS_CHANGED',
      title: `Reopen Request Accepted`,
      message: `Your reopen request for complaint ${complaint.complaintId} was accepted. Status moved to UNDER_REVIEW for repair.`,
      relatedComplaintId: complaint._id,
    });

    return { reopenRequest: reopenDoc, complaint: updatedComplaint };
  } else if (action === 'REJECT') {
    reopenDoc.status = 'REJECTED';
    reopenDoc.reviewedBy = user._id;
    reopenDoc.reviewComment = cleanComment;
    await reopenDoc.save();

    await AuditLog.create({
      action: 'REOPEN_REQUEST_REJECTED',
      entity: 'ReopenRequest',
      entityId: reopenDoc._id,
      actor: user._id,
      metadata: {
        complaintId: complaint.complaintId,
        reopenRequestId: reopenDoc._id,
        comment: cleanComment,
      },
    });

    await createInAppNotification({
      userId: complaint.citizenId,
      type: 'COMPLAINT_STATUS_CHANGED',
      title: `Reopen Request Decision`,
      message: `Your reopen request for complaint ${complaint.complaintId} was reviewed: ${cleanComment}`,
      relatedComplaintId: complaint._id,
    });

    return { reopenRequest: reopenDoc, complaint };
  }

  throw new Error(`Invalid review action: ${action}`);
};
