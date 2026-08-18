import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

export const Lead = mongoose.model('Lead', leadSchema)
