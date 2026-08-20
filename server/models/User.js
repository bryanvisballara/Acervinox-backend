import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'workshop', 'client'], default: 'client' },
    emailVerified: { type: Boolean, default: false },
    verifyCode: { type: String, default: '' },
    verifyExpires: { type: Date },
    resetCode: { type: String, default: '' },
    resetExpires: { type: Date },
    savedTrackings: { type: [String], default: [] },
    pushSubs: {
      type: [
        {
          endpoint: { type: String, default: '' },
          p256dh: { type: String, default: '' },
          auth: { type: String, default: '' },
          platform: { type: String, enum: ['web', 'ios', 'android'], default: 'web' },
          token: { type: String, default: '' },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
)

export const User = mongoose.model('User', userSchema)
