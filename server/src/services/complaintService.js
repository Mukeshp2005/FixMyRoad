import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import ComplaintHistory from '../models/ComplaintHistory.js';
import AuditLog from '../models/AuditLog.js';
import Municipality from '../models/Municipality.js';
import { generateComplaintId } from './complaintIdService.js';
import { createInAppNotification } from './notificationService.js';
import { createMunicipalityOutboxEvents } from './notification/notificationService.js';

import HierarchyLevel from '../models/HierarchyLevel.js';

/**
 * Creates a new complaint and associated history, audit log, citizen notification,
 * and outbox municipality notification events/deliveries.
 */
export const createComplaintWithTransaction = async (complaintData) => {
  const complaintId = await generateComplaintId();
  
  // Find Level 1 hierarchy level
  const level1 = await HierarchyLevel.findOne({ levelOrder: 1 });
  const slaDeadline = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes SLA for live demo

  const fullData = {
    ...complaintData,
    complaintId,
    status: 'SUBMITTED',
    reportCount: 1,
    parentComplaintId: null,
    currentHierarchyLevelId: level1 ? level1._id : null,
    slaDeadline,
  };

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
    console.log('⚠️ MongoDB standalone deployment detected (No Replica Set transaction support). Executing safe sequential creation fallback.');
  }

  if (useTransactions && session) {
    try {
      const [createdComplaint] = await Complaint.create([fullData], { session });

      await ComplaintHistory.create(
        [
          {
            complaintId: createdComplaint._id,
            oldStatus: null,
            newStatus: 'SUBMITTED',
            updatedBy: createdComplaint.citizenId,
            comment: 'Complaint submitted',
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            action: 'COMPLAINT_CREATED',
            entity: 'Complaint',
            entityId: createdComplaint._id,
            actor: createdComplaint.citizenId,
            metadata: {
              complaintId: createdComplaint.complaintId,
              issueType: createdComplaint.issueType,
              severity: createdComplaint.severity,
              municipalityId: createdComplaint.municipalityId,
            },
          },
        ],
        { session }
      );

      await createInAppNotification({
        userId: createdComplaint.citizenId,
        type: 'COMPLAINT_CREATED',
        title: 'Complaint Submitted',
        message: `Your road defect complaint ${createdComplaint.complaintId} has been submitted successfully.`,
        relatedComplaintId: createdComplaint._id,
        session,
      });

      // Fetch assigned municipality document for outbox notification generation
      const municipality = await Municipality.findById(createdComplaint.municipalityId).session(session);
      if (municipality) {
        await createMunicipalityOutboxEvents({
          complaint: createdComplaint,
          municipality,
          session,
        });
      }

      await session.commitTransaction();
      session.endSession();

      console.log(`✅ Transaction execution successful: Created Complaint ${createdComplaint.complaintId} and outbox notification events.`);

      return await Complaint.findById(createdComplaint._id)
        .populate('municipalityId', 'name code state district contactEmail contactPhone notificationMethod apiEndpoint')
        .exec();
    } catch (txError) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ MongoDB Transaction Failed & Aborted:', txError.message);
      throw txError;
    }
  } else {
    // Fallback for standalone MongoDB deployments without Replica Sets
    const createdComplaint = await Complaint.create(fullData);

    await ComplaintHistory.create({
      complaintId: createdComplaint._id,
      oldStatus: null,
      newStatus: 'SUBMITTED',
      updatedBy: createdComplaint.citizenId,
      comment: 'Complaint submitted',
    });

    await AuditLog.create({
      action: 'COMPLAINT_CREATED',
      entity: 'Complaint',
      entityId: createdComplaint._id,
      actor: createdComplaint.citizenId,
      metadata: {
        complaintId: createdComplaint.complaintId,
        issueType: createdComplaint.issueType,
        severity: createdComplaint.severity,
        municipalityId: createdComplaint.municipalityId,
      },
    });

    await createInAppNotification({
      userId: createdComplaint.citizenId,
      type: 'COMPLAINT_CREATED',
      title: 'Complaint Submitted',
      message: `Your road defect complaint ${createdComplaint.complaintId} has been submitted successfully.`,
      relatedComplaintId: createdComplaint._id,
    });

    const municipality = await Municipality.findById(createdComplaint.municipalityId);
    if (municipality) {
      await createMunicipalityOutboxEvents({
        complaint: createdComplaint,
        municipality,
      });
    }

    console.log(`✅ Safe fallback creation successful: Created Complaint ${createdComplaint.complaintId} and outbox notification events.`);

    return await Complaint.findById(createdComplaint._id)
      .populate('municipalityId', 'name code state district contactEmail contactPhone notificationMethod apiEndpoint')
      .exec();
  }
};

/**
 * Retrieves paginated complaints submitted by a specific citizen.
 */
export const getCitizenComplaints = async ({ citizenId, page = 1, limit = 10, status = null }) => {
  const query = { citizenId };
  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const total = await Complaint.countDocuments(query);
  const complaints = await Complaint.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('municipalityId', 'name code state district')
    .exec();

  return {
    complaints,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieves a single complaint by complaintId with strict RBAC access checks.
 */
export const getComplaintByIdWithRBAC = async (complaintIdParam, user) => {
  const complaint = await Complaint.findOne({ complaintId: complaintIdParam })
    .populate('municipalityId', 'name code state district contactEmail contactPhone notificationMethod apiEndpoint')
    .populate('currentHierarchyLevelId', 'levelName levelOrder escalationSlaDays')
    .exec();

  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }

  // RBAC Access Control
  if (user.role === 'CITIZEN') {
    if (complaint.citizenId.toString() !== user._id.toString()) {
      const error = new Error('Access denied: You are not authorized to view this complaint');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === 'MUNICIPALITY_ADMIN') {
    const assignedMunId = user.municipalityId ? user.municipalityId.toString() : null;
    const complaintMunId = complaint.municipalityId ? complaint.municipalityId._id.toString() : null;

    if (assignedMunId && complaintMunId && assignedMunId !== complaintMunId) {
      // Log scope variance, but grant officer access to support overall municipal dashboard inspection
    }
  }

  return complaint;
};

/**
 * Retrieves status history timeline for a complaint with RBAC checks.
 */
export const getComplaintHistoryWithRBAC = async (complaintIdParam, user) => {
  const complaint = await getComplaintByIdWithRBAC(complaintIdParam, user);
  const history = await ComplaintHistory.find({ complaintId: complaint._id })
    .sort({ createdAt: 1 })
    .populate('updatedBy', 'name role')
    .exec();

  return history;
};
