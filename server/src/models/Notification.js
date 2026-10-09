import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'COMPLAINT_CREATED',
        'STATUS_UPDATED',
        'MUNICIPALITY_ASSIGNED',
        'RESOLVED',
        'REOPENED',
        'COMPLAINT_ESCALATED',
        'SYSTEM',
        'COMPLAINT_STATUS_CHANGED',
        'COMPLAINT_RESOLVED',
        'REJECTED',
      ],
      required: [true, 'Notification type is required'],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
