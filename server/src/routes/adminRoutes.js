import express from 'express';
import {
  getGlobalStats,
  getGlobalComplaints,
  getAllUsers,
  createOfficialOrAdminUser,
  deleteUser,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// GET /api/admin/dashboard/stats - Super Admin global metrics across all municipalities
router.get(
  '/dashboard/stats',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  getGlobalStats
);

// GET /api/admin/complaints - Super Admin multi-tenant global complaint overview
router.get(
  '/complaints',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  getGlobalComplaints
);

// User Management Routes
router.get('/users', authenticate, authorizeRoles('SUPER_ADMIN'), getAllUsers);
router.post('/users', authenticate, authorizeRoles('SUPER_ADMIN'), createOfficialOrAdminUser);
router.delete('/users/:userId', authenticate, authorizeRoles('SUPER_ADMIN'), deleteUser);

export default router;

