import express from 'express';
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintHistory,
  updateCitizenComplaint,
  deleteCitizenComplaint,
  verifyImageAndDescription,
} from '../controllers/complaintController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { complaintRateLimiter } from '../middleware/complaintRateLimiter.js';

const router = express.Router();

// POST /api/complaints/verify-image - Pre-submission Gemini AI image & description verification
router.post('/verify-image', authenticate, authorizeRoles('CITIZEN'), verifyImageAndDescription);

// POST /api/complaints - Create new complaint (CITIZEN only)
router.post(
  '/',
  authenticate,
  authorizeRoles('CITIZEN'),
  complaintRateLimiter,
  createComplaint
);

// GET /api/complaints/my - Get citizen's own complaints (CITIZEN only)
router.get('/my', authenticate, authorizeRoles('CITIZEN'), getMyComplaints);

// GET /api/complaints/:complaintId - Get single complaint details (RBAC check)
router.get('/:complaintId', authenticate, getComplaintById);

// PUT /api/complaints/:complaintId - Citizen edit complaint (CITIZEN only)
router.put('/:complaintId', authenticate, authorizeRoles('CITIZEN'), updateCitizenComplaint);

// DELETE /api/complaints/:complaintId - Citizen delete complaint (CITIZEN only)
router.delete('/:complaintId', authenticate, authorizeRoles('CITIZEN'), deleteCitizenComplaint);

// GET /api/complaints/:complaintId/history - Get status history timeline (RBAC check)
router.get('/:complaintId/history', authenticate, getComplaintHistory);

export default router;
