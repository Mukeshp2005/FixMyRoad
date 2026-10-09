import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import ComplaintHistory from '../models/ComplaintHistory.js';
import AuditLog from '../models/AuditLog.js';
import ReopenRequest from '../models/ReopenRequest.js';
import { createInAppNotification } from './notificationService.js';

export const VALID_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export const ALLOWED_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  UNDER_REVIEW: ['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ACCEPTED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'UNDER_REVIEW'],
  REJECTED: [],
  CLOSED: [],
};

/**
 * Validates whether a status transition is permitted by workflow rules.
 */
export const isValidStatusTransition = (currentStatus, targetStatus) => {
  if (!VALID_STATUSES.includes(targetStatus)) return false;
  if (!currentStatus) return targetStatus === 'SUBMITTED';
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Executes a status transition with database transaction (or safe fallback).
 */
export const changeComplaintStatusWithTransaction = async ({
  complaint,
  targetStatus,
  comment = '',
  assignedTo = undefined,
  resolutionComment = undefined,
  resolutionImage = undefined,
  updatedBy,
}) => {
  const currentStatus = complaint.status;

  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    const error = new Error(`Invalid status transition: Cannot move complaint from ${currentStatus} to ${targetStatus}`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  // Rejection requires comment/reason
  if (targetStatus === 'REJECTED' && (!comment || comment.trim() === '')) {
    const error = new Error('A valid rejection reason/comment is required when rejecting a complaint');
    error.statusCode = 400;
    error.code = 'REJECTION_COMMENT_REQUIRED';
    throw error;
  }

  // Resolution requires resolutionComment and sets resolvedAt
  if (targetStatus === 'RESOLVED') {
    if (!resolutionComment && (!comment || comment.trim() === '')) {
      const error = new Error('A resolution summary comment is required when resolving a complaint');
      error.statusCode = 400;
      error.code = 'RESOLUTION_COMMENT_REQUIRED';
      throw error;
    }
  }

  const updateFields = {
    status: targetStatus,
  };

  if (assignedTo !== undefined) {
    updateFields.assignedTo = assignedTo;
  }

  if (targetStatus === 'REJECTED') {
    updateFields.rejectionReason = comment;
  }

  if (resolutionComment !== undefined) {
    updateFields.resolutionComment = resolutionComment;
  } else if (targetStatus === 'RESOLVED' && comment) {
    updateFields.resolutionComment = comment;
  }

  if (resolutionImage !== undefined) {
    updateFields.resolutionImage = resolutionImage;
  }

  if (targetStatus === 'RESOLVED') {
    updateFields.resolvedAt = new Date();

    // Check if complaint was previously reopened and is now reaching the NEXT RESOLVED state
    const currentCycle = complaint.resolutionCycle || 1;
    const acceptedReopen = await ReopenRequest.findOne({
      complaintId: complaint._id,
      resolutionCycle: currentCycle,
      status: 'ACCEPTED',
    });

    if (acceptedReopen) {
      // Increment resolutionCycle when reaching RESOLVED after an accepted reopen request
      updateFields.resolutionCycle = currentCycle + 1;
      updateFields.citizenVerified = false;
      updateFields.citizenVerifiedAt = null;
      updateFields.citizenRating = null;
    }
  }

  let session = null;
  let useTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransactions = true;
  } catch (err) {
    if (session) session.endSession();
    session = null;
    useTransactions = false;
    console.log('⚠️ MongoDB standalone deployment detected. Executing safe fallback status update.');
  }

  if (useTransactions && session) {
    try {
      const updatedComplaint = await Complaint.findByIdAndUpdate(complaint._id, updateFields, {
        new: true,
        runValidators: true,
        session,
      })
        .populate('municipalityId', 'name code district state')
        .populate('assignedTo', 'name email role phone')
        .exec();

      await ComplaintHistory.create(
        [
          {
            complaintId: complaint._id,
            oldStatus: currentStatus,
            newStatus: targetStatus,
            updatedBy,
            comment: comment || `Status updated from ${currentStatus} to ${targetStatus}`,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            action: targetStatus === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : targetStatus === 'CLOSED' ? 'COMPLAINT_CLOSED' : 'COMPLAINT_STATUS_CHANGED',
            entity: 'Complaint',
            entityId: complaint._id,
            actor: updatedBy,
            metadata: {
              complaintId: complaint.complaintId,
              oldStatus: currentStatus,
              newStatus: targetStatus,
              assignedTo: updateFields.assignedTo || null,
            },
          },
        ],
        { session }
      );

      // Create Citizen Notification for Status Change
      await createInAppNotification({
        userId: complaint.citizenId,
        type: 'COMPLAINT_STATUS_CHANGED',
        title: `Complaint ${complaint.complaintId} Update`,
        message: `Your complaint status has been updated to ${targetStatus}.`,
        relatedComplaintId: complaint._id,
        session,
      });

      await session.commitTransaction();
      session.endSession();

      console.log(`✅ Status transition transaction successful: Complaint ${complaint.complaintId} moved from ${currentStatus} → ${targetStatus}`);

      return updatedComplaint;
    } catch (txErr) {
      await session.abortTransaction();
      session.endSession();
      throw txErr;
    }
  } else {
    // Standalone fallback
    const updatedComplaint = await Complaint.findByIdAndUpdate(complaint._id, updateFields, {
      new: true,
      runValidators: true,
    })
      .populate('municipalityId', 'name code district state')
      .populate('assignedTo', 'name email role phone')
      .exec();

    await ComplaintHistory.create({
      complaintId: complaint._id,
      oldStatus: currentStatus,
      newStatus: targetStatus,
      updatedBy,
      comment: comment || `Status updated from ${currentStatus} to ${targetStatus}`,
    });

    await AuditLog.create({
      action: targetStatus === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : targetStatus === 'CLOSED' ? 'COMPLAINT_CLOSED' : 'COMPLAINT_STATUS_CHANGED',
      entity: 'Complaint',
      entityId: complaint._id,
      actor: updatedBy,
      metadata: {
        complaintId: complaint.complaintId,
        oldStatus: currentStatus,
        newStatus: targetStatus,
        assignedTo: updateFields.assignedTo || null,
      },
    });

    await createInAppNotification({
      userId: complaint.citizenId,
      type: 'COMPLAINT_STATUS_CHANGED',
      title: `Complaint ${complaint.complaintId} Update`,
      message: `Your complaint status has been updated to ${targetStatus}.`,
      relatedComplaintId: complaint._id,
    });

    console.log(`✅ Status transition fallback successful: Complaint ${complaint.complaintId} moved from ${currentStatus} → ${targetStatus}`);

    return updatedComplaint;
  }
};
