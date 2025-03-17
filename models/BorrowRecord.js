// models/BorrowRecord.js - Borrow record schema and model

const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book ID is required'],
  },
  borrowDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  returnDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue'],
    default: 'borrowed',
  },
  fine: {
    amount: {
      type: Number,
      default: 0,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    }
  },
  notes: {
    type: String,
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Method to check if the book is overdue
borrowRecordSchema.methods.isOverdue = function() {
  if (this.status === 'returned') {
    return false;
  }
  return new Date() > this.dueDate;
};

// Method to calculate fine amount
borrowRecordSchema.methods.calculateFine = function(fineRatePerDay = 1) {
  if (this.status === 'returned' && !this.isOverdue()) {
    return 0;
  }
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  
  // Calculate days overdue
  const timeDiff = today - dueDate;
  const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return Math.max(0, daysOverdue) * fineRatePerDay;
};

// Pre-save hook to update status if overdue
borrowRecordSchema.pre('save', function(next) {
  if (this.isModified('dueDate') || this.isNew) {
    if (this.isOverdue() && this.status === 'borrowed') {
      this.status = 'overdue';
    }
  }
  next();
});

// Create indexes for frequently queried fields
borrowRecordSchema.index({ user: 1, status: 1 });
borrowRecordSchema.index({ book: 1, status: 1 });
borrowRecordSchema.index({ dueDate: 1, status: 1 });

// Export the model
const BorrowRecord = mongoose.model('BorrowRecord', borrowRecordSchema);
module.exports = BorrowRecord;