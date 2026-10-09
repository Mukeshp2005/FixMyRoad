import axios from 'axios';
import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import { validateImageUrlSSRF, analyzeRoadImageWithAI } from '../services/aiService.js';
import { reverseGeocode } from '../services/geocodingService.js';
import { findMunicipalityByCoordinates } from '../services/municipalityService.js';
import {
  createComplaintWithTransaction,
  getCitizenComplaints,
  getComplaintByIdWithRBAC,
  getComplaintHistoryWithRBAC,
} from '../services/complaintService.js';

/**
 * @desc    Submit a new road defect complaint
 * @route   POST /api/complaints
 * @access  Private (CITIZEN role only)
 */
export const createComplaint = async (req, res, next) => {
  try {
    const { imageUrl, description, location, departmentName, taluk, zone } = req.body;

    // 1. Basic Payload Validation
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'imageUrl is required',
      });
    }

    if (!location || location.latitude === undefined || location.longitude === undefined) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_COORDINATES',
        message: 'location with valid latitude and longitude is required',
      });
    }

    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_COORDINATES',
        message: 'Latitude must be between -90 and 90, Longitude between -180 and 180.',
      });
    }

    // 2. SSRF Image URL Validation & Redirect-Blocked Image Access Verification
    validateImageUrlSSRF(imageUrl);

    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
      try {
        await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxRedirects: 0,
          headers: {
            'User-Agent': 'FixMyRoad-Backend/1.0',
          },
        });
      } catch (imgErr) {
        console.warn('Notice verifying remote image URL:', imgErr.message);
      }
    }

    // 3. Server-Side Reverse Geocoding
    let addressData;
    try {
      addressData = await reverseGeocode(latitude, longitude);
    } catch (err) {
      addressData = {
        address: 'Captured Location',
        city: '',
        district: '',
        state: '',
        country: '',
        postalCode: '',
      };
    }

    // 4. Server-Side GeoJSON Municipality Resolution ($geoIntersects)
    const munResult = await findMunicipalityByCoordinates(latitude, longitude);
    if (!munResult.success) {
      const statusCode = munResult.code === 'MUNICIPALITY_NOT_FOUND' ? 404 : 409;
      return res.status(statusCode).json(munResult);
    }

    const resolvedMunicipality = munResult.data.municipality;

    // 5. Sanitize Description & Execute Gemini AI Image Analysis
    const sanitizedDescription = description && typeof description === 'string'
      ? description.trim().substring(0, 1000)
      : '';

    const allowAiUnavailable = process.env.ALLOW_AI_UNAVAILABLE_SUBMISSION === 'true';
    let aiResult;

    try {
      aiResult = await analyzeRoadImageWithAI(imageUrl, sanitizedDescription);
    } catch (aiErr) {
      if (!allowAiUnavailable) {
        return res.status(503).json({
          success: false,
          code: 'AI_UNAVAILABLE',
          message: 'Gemini AI image analysis service is currently unavailable. Please try again later.',
        });
      }
    }

    if (aiResult && aiResult.isFakeImage) {
      return res.status(400).json({
        success: false,
        code: 'FAKE_IMAGE_REJECTED',
        message: `Gemini AI Verification Failed: ${aiResult.aiReasoning || 'Uploaded image does not appear to be a legitimate civic defect matching your description.'}`,
      });
    }

    // Determine derived AI fields
    const issueType = aiResult?.primaryIssue || 'OTHER';
    const aiConfidence = aiResult?.overallConfidence || 0;
    const severity = aiResult?.severity || 'MEDIUM';

    // 6. Citizen ID derived strictly from req.user._id
    const citizenId = req.user._id;

    // 7. Assemble Server-Validated Complaint Payload
    const complaintPayload = {
      citizenId,
      imageUrl,
      issueType,
      aiConfidence,
      severity,
      description: sanitizedDescription,
      departmentName: departmentName || 'ROADS_PWD',
      taluk: taluk || '',
      zone: zone || '',
      isFakeImage: Boolean(aiResult?.isFakeImage),
      geminiReasoning: aiResult?.aiReasoning || '',
      verificationStatus: aiResult?.verificationStatus || 'VERIFIED',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      locationSource: location.source === 'MAP' ? 'MAP' : 'GPS',
      locationAccuracy: location.accuracy ? parseFloat(location.accuracy) : null,
      address: addressData.address || '',
      city: addressData.city || '',
      district: addressData.district || '',
      state: addressData.state || '',
      country: addressData.country || '',
      postalCode: addressData.postalCode || '',
      municipalityId: resolvedMunicipality.id || resolvedMunicipality._id,
    };

    // 9. Execute Complaint Creation Transaction
    const newComplaint = await createComplaintWithTransaction(complaintPayload);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        complaint: newComplaint,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated citizen's submitted complaints
 * @route   GET /api/complaints/my
 * @access  Private (CITIZEN role only)
 */
export const getMyComplaints = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await getCitizenComplaints({
      citizenId: req.user._id,
      page,
      limit,
      status,
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
 * @desc    Get single complaint details by complaintId
 * @route   GET /api/complaints/:complaintId
 * @access  Private (Authenticated users with RBAC check)
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await getComplaintByIdWithRBAC(req.params.complaintId, req.user);

    res.status(200).json({
      success: true,
      data: {
        complaint,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get status history timeline for a complaint
 * @route   GET /api/complaints/:complaintId/history
 * @access  Private (Authenticated users with RBAC check)
 */
export const getComplaintHistory = async (req, res, next) => {
  try {
    const history = await getComplaintHistoryWithRBAC(req.params.complaintId, req.user);

    res.status(200).json({
      success: true,
      data: {
        history,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Update citizen complaint (description, department, taluk, zone)
 * @route   PUT /api/complaints/:complaintId
 * @access  Private (CITIZEN role, owner only)
 */
export const updateCitizenComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { description, departmentName, taluk, zone } = req.body;

    const query = mongoose.isValidObjectId(complaintId)
      ? { $or: [{ _id: complaintId }, { complaintId }] }
      : { complaintId };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.citizenId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this complaint' });
    }

    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: 'Cannot edit a finalized complaint' });
    }

    if (description !== undefined) complaint.description = description;
    if (departmentName !== undefined) complaint.departmentName = departmentName;
    if (taluk !== undefined) complaint.taluk = taluk;
    if (zone !== undefined) complaint.zone = zone;

    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: { complaint },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete citizen complaint
 * @route   DELETE /api/complaints/:complaintId
 * @access  Private (CITIZEN role, owner only)
 */
export const deleteCitizenComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const query = mongoose.isValidObjectId(complaintId)
      ? { $or: [{ _id: complaintId }, { complaintId }] }
      : { complaintId };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.citizenId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint' });
    }

    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete a finalized complaint' });
    }

    await Complaint.findOneAndDelete(query);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify image and description match with Gemini AI pre-submission
 * @route   POST /api/complaints/verify-image
 * @access  Private (CITIZEN role)
 */
export const verifyImageAndDescription = async (req, res, next) => {
  try {
    const { imageUrl, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    const aiResult = await analyzeRoadImageWithAI(imageUrl, description || '');

    res.status(200).json({
      success: true,
      data: {
        isFakeImage: Boolean(aiResult.isFakeImage),
        isValidRoad: Boolean(aiResult.isValidRoad),
        verificationStatus: aiResult.verificationStatus,
        aiReasoning: aiResult.aiReasoning,
        primaryIssue: aiResult.primaryIssue,
        confidence: aiResult.overallConfidence,
      },
    });
  } catch (error) {
    next(error);
  }
};
