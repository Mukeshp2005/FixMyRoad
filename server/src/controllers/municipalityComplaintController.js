import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Municipality from '../models/Municipality.js';
import HierarchyLevel from '../models/HierarchyLevel.js';
import { changeComplaintStatusWithTransaction } from '../services/complaintStatusService.js';
import {
  getMunicipalityStats,
  getMunicipalityComplaints,
  getMunicipalityOfficers,
  assignComplaintToOfficer,
} from '../services/municipalityComplaintService.js';
import { processAndUploadImage } from '../services/imageUploadService.js';

/**
 * @desc    Get dashboard metrics strictly for authenticated municipality admin's jurisdiction
 * @route   GET /api/municipality/dashboard/stats
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const municipalityId = req.user.municipalityId || null;
    const stats = await getMunicipalityStats(municipalityId);

    res.status(200).json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated filtered complaints for admin's municipality
 * @route   GET /api/municipality/complaints
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const getComplaints = async (req, res, next) => {
  try {
    const municipalityId = req.user.municipalityId;
    const { page, limit, status, severity, issueType, search, sort, from, to } = req.query;

    const result = await getMunicipalityComplaints({
      municipalityId,
      page,
      limit,
      status,
      severity,
      issueType,
      search,
      sort,
      from,
      to,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single complaint details with tenant isolation check
 * @route   GET /api/municipality/complaints/:complaintId
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const getComplaintDetails = async (req, res, next) => {
  try {
    const complaintIdParam = req.params.complaintId;
    const targetId = req.complaint?._id || complaintIdParam;

    const query = mongoose.isValidObjectId(targetId)
      ? { $or: [{ _id: targetId }, { complaintId: targetId }] }
      : { complaintId: targetId };

    const complaint = await Complaint.findOne(query)
      .populate('citizenId', 'name email phone')
      .populate('assignedTo', 'name email role phone')
      .populate('municipalityId', 'name code state district contactEmail contactPhone notificationMethod apiEndpoint')
      .populate('currentHierarchyLevelId', 'levelName levelOrder escalationSlaDays')
      .exec();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        complaint,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update complaint status through state machine rules
 * @route   PATCH /api/municipality/complaints/:complaintId/status
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { targetStatus, comment, resolutionComment, resolutionImage } = req.body;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: 'targetStatus is required',
      });
    }

    const updatedComplaint = await changeComplaintStatusWithTransaction({
      complaint: req.complaint,
      targetStatus,
      comment,
      resolutionComment,
      resolutionImage,
      updatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${targetStatus} successfully`,
      data: {
        complaint: updatedComplaint,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'BAD_REQUEST',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Assign complaint to active municipal officer (State machine: ACCEPTED -> ASSIGNED)
 * @route   PATCH /api/municipality/complaints/:complaintId/assign
 * @access  Private (MUNICIPALITY_ADMIN)
 */
export const assignComplaint = async (req, res, next) => {
  try {
    const { assignedTo, comment } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'assignedTo (officerId) is required',
      });
    }

    const updatedComplaint = await assignComplaintToOfficer({
      complaint: req.complaint,
      officerId: assignedTo,
      comment,
      updatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Complaint assigned to officer successfully',
      data: {
        complaint: updatedComplaint,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'BAD_REQUEST',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Upload resolution evidence image to Cloudinary
 * @route   POST /api/municipality/complaints/:complaintId/resolution-image
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const uploadResolutionImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    const uploadResult = await processAndUploadImage(
      req.file.buffer,
      'fixmyroad/resolutions'
    );

    res.status(200).json({
      success: true,
      message: 'Resolution evidence image uploaded successfully',
      data: {
        resolutionImageUrl: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active municipal officers available for assignment
 * @route   GET /api/municipality/officers
 * @access  Private (MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER)
 */
export const getOfficers = async (req, res, next) => {
  try {
    const municipalityId = req.user.municipalityId;
    const officers = await getMunicipalityOfficers(municipalityId);

    res.status(200).json({
      success: true,
      data: {
        officers,
      },
    });
  } catch (error) {
    next(error);
  }
};
