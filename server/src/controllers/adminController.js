import Complaint from '../models/Complaint.js';
import Municipality from '../models/Municipality.js';
import User from '../models/User.js';
import { getMunicipalityStats, getMunicipalityComplaints } from '../services/municipalityComplaintService.js';

/**
 * @desc    Get global complaint statistics for Super Admin
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (SUPER_ADMIN)
 */
export const getGlobalStats = async (req, res, next) => {
  try {
    const { municipalityId } = req.query;

    if (municipalityId) {
      const stats = await getMunicipalityStats(municipalityId);
      return res.status(200).json({
        success: true,
        data: {
          stats,
        },
      });
    }

    const totalMunicipalities = await Municipality.countDocuments({ active: true });
    const stats = await getMunicipalityStats(null); // All municipalities

    res.status(200).json({
      success: true,
      data: {
        totalMunicipalities,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get global multi-tenant complaints for Super Admin
 * @route   GET /api/admin/complaints
 * @access  Private (SUPER_ADMIN)
 */
export const getGlobalComplaints = async (req, res, next) => {
  try {
    const { municipalityId, page, limit, status, severity, issueType, search, sort, from, to } = req.query;

    const result = await getMunicipalityComplaints({
      municipalityId: municipalityId || null,
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
 * @desc    Get all users (Government Officials, Admins, Citizens) for Super Admin
 * @route   GET /api/admin/users
 * @access  Private (SUPER_ADMIN)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new Government Official or Admin user with custom username & password
 * @route   POST /api/admin/users
 * @access  Private (SUPER_ADMIN)
 */
export const createOfficialOrAdminUser = async (req, res, next) => {
  try {
    const { name, email, username, password, role, phone } = req.body;

    if (!['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be MUNICIPALITY_ADMIN, MUNICIPALITY_OFFICER, or SUPER_ADMIN.',
      });
    }

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, username, and password are required.',
      });
    }

    // Check duplicate email or username
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another.',
      });
    }

    // Attach default active municipality if available
    const defaultMun = await Municipality.findOne({ active: true });

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      role,
      phone: phone || '',
      isEmailVerified: true,
      municipalityId: defaultMun ? defaultMun._id : null,
    });

    res.status(201).json({
      success: true,
      message: `User created successfully with role ${role}`,
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove/Delete a user ID by Super Admin
 * @route   DELETE /api/admin/users/:userId
 * @access  Private (SUPER_ADMIN)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in admin account.',
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: `User account (${targetUser.username || targetUser.email}) removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

