import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';

/**
 * Middleware authorizing government officers to inspect and manage citizen complaints.
 */
export const verifyMunicipalityComplaintAccess = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID is required',
      });
    }

    const query = mongoose.isValidObjectId(complaintId)
      ? { $or: [{ _id: complaintId }, { complaintId }] }
      : { complaintId };

    const complaint = await Complaint.findOne(query);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // SUPER_ADMIN, MUNICIPALITY_ADMIN, & MUNICIPALITY_OFFICER have full official inspection authorization
    if (['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER'].includes(req.user.role)) {
      req.complaint = complaint;
      return next();
    }

    // CITIZEN Ownership Protection
    if (req.user.role === 'CITIZEN') {
      if (complaint.citizenId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this complaint',
        });
      }

      req.complaint = complaint;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden',
    });
  } catch (error) {
    next(error);
  }
};
