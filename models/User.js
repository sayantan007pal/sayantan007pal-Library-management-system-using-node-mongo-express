// models/User.js - User schema and model

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  membershipType: {
    type: String,
    enum: ['regular', 'premium', 'student', 'staff'],
    default: 'regular',
  },
  membershipDate: {
    type: Date,
    default: Date.now,
  },
  membershipExpiry: {
    type: Date,
    default: function() {
      // By default, set expiry to 1 year from membership date
      const date = new Date(this.membershipDate);
      date.setFullYear(date.getFullYear() + 1);
      return date;
    }
  },
  borrowedBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BorrowRecord',
  }],
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Create virtual property for membership status
userSchema.virtual('isMembershipValid').get(function() {
  return this.isActive && new Date() < this.membershipExpiry;
});

// Create indexes for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ name: 'text' });

// Export the model
const User = mongoose.model('User', userSchema);
module.exports = User;