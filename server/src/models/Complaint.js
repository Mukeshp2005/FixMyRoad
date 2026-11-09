import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: [true, 'Complaint ID is required'],
      unique: true,
      trim: true,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen ID is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    issueType: {
      type: String,
      trim: true,
      default: 'OTHER',
    },
    aiConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    isFakeImage: {
      type: Boolean,
      default: false,
    },
    geminiReasoning: {
      type: String,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'FAKE_IMAGE', 'UNMATCHED_DESCRIPTION', 'PENDING'],
      default: 'VERIFIED',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    locationSource: {
      type: String,
      enum: ['GPS', 'MAP'],
      default: 'GPS',
    },
    locationAccuracy: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    district: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    postalCode: {
      type: String,
      default: '',
      trim: true,
    },
    municipalityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality',
      required: [true, 'Municipality ID is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    currentHierarchyLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HierarchyLevel',
      default: null,
    },
    slaDeadline: {
      type: Date,
      default: null,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'ACCEPTED',
        'REJECTED',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED',
      ],
      default: 'SUBMITTED',
    },
    reportCount: {
      type: Number,
      default: 1,
    },
    parentComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    resolutionComment: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    resolutionImage: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionCycle: {
      type: Number,
      default: 1,
    },
    citizenVerified: {
      type: Boolean,
      default: false,
    },
    citizenVerifiedAt: {
      type: Date,
      default: null,
    },
    citizenRating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance geospatial queries & compound lookups
complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ citizenId: 1, createdAt: -1 });
complaintSchema.index({ municipalityId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
