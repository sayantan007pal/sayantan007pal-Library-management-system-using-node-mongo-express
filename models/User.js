// models/User.js - Enhanced User schema and model

const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      // Generate a unique user ID with prefix "LIB-U" followed by 6 alphanumeric characters
      return 'LIB-U' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }
  },
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
  borrowHistory: {
    totalBooksBorrowed: {
      type: Number,
      default: 0
    },
    totalBooksReturned: {
      type: Number,
      default: 0
    },
    totalFinesPaid: {
      type: Number,
      default: 0
    },
    totalFinesOutstanding: {
      type: Number,
      default: 0
    },
    lastBorrowDate: {
      type: Date
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String
  },
  preferences: {
    receiveNotifications: {
      type: Boolean,
      default: true
    },
    notificationChannel: {
      type: String,
      enum: ['email', 'sms', 'both', 'none'],
      default: 'email'
    },
    favoriteGenres: [String]
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  toJSON: { virtuals: true }, // Include virtual fields when converting to JSON
  toObject: { virtuals: true } // Include virtual fields when converting to object
});

// Create virtual property for membership status
userSchema.virtual('isMembershipValid').get(function() {
  return this.isActive && new Date() < this.membershipExpiry;
});

// Virtual for membership days remaining
userSchema.virtual('membershipDaysRemaining').get(function() {
  if (!this.isMembershipValid) {
    return 0;
  }
  
  const today = new Date();
  const expiry = new Date(this.membershipExpiry);
  const timeDiff = expiry - today;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for current borrow count
userSchema.virtual('currentBorrowCount').get(function() {
  return this.borrowedBooks.length;
});

// Create indexes for frequently queried fields
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ name: 'text' });

// Export the model
const User = mongoose.model('User', userSchema);
module.exports = User;