// models/BorrowRecord.js - Enhanced borrow record schema and model

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
    enum: ['borrowed', 'returned', 'overdue', 'lost'],
    default: 'borrowed',
  },
  fine: {
    amount: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      enum: ['late', 'damaged', 'lost', 'other'],
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'online', 'waived'],
    }
  },
  renewalCount: {
    type: Number,
    default: 0,
  },
  renewalHistory: [{
    renewedDate: Date,
    previousDueDate: Date,
    newDueDate: Date
  }],
  bookCondition: {
    checkedOut: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    returned: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'damaged', 'lost']
    }
  },
  notes: {
    type: String,
  },
  transactionId: {
    type: String,
    unique: true,
    default: function() {
      return 'TR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().substring(8);
    }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  toJSON: { virtuals: true }, // Include virtual fields when converting to JSON
  toObject: { virtuals: true } // Include virtual fields when converting to object
});

// Virtual field for days remaining/overdue
borrowRecordSchema.virtual('daysRemaining').get(function() {
  if (this.status === 'returned') {
    return 0;
  }
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const timeDiff = dueDate - today;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual field for borrowed duration
borrowRecordSchema.virtual('borrowDuration').get(function() {
  const endDate = this.returnDate || new Date();
  const startDate = new Date(this.borrowDate);
  const timeDiff = endDate - startDate;
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
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
  
  let fineAmount = 0;
  
  if (this.status === 'lost') {
    return 50; // Base charge for lost books
  }
  
  if (this.isOverdue()) {
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    
    // Calculate days overdue
    const timeDiff = today - dueDate;
    const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Progressive fine rate
    if (daysOverdue <= 7) {
      fineAmount = daysOverdue * fineRatePerDay;
    } else if (daysOverdue <= 14) {
      fineAmount = 7 * fineRatePerDay + (daysOverdue - 7) * (fineRatePerDay * 1.5);
    } else {
      fineAmount = 7 * fineRatePerDay + 7 * (fineRatePerDay * 1.5) + (daysOverdue - 14) * (fineRatePerDay * 2);
    }
  }
  
  return parseFloat(fineAmount.toFixed(2));
};

// Method to renew a book
borrowRecordSchema.methods.renewBook = function(extensionDays = 7) {
  if (this.status !== 'borrowed' || this.isOverdue()) {
    return false;
  }
  
  const previousDueDate = new Date(this.dueDate);
  const newDueDate = new Date(previousDueDate);
  newDueDate.setDate(newDueDate.getDate() + extensionDays);
  
  // Add to renewal history
  this.renewalHistory.push({
    renewedDate: new Date(),
    previousDueDate: previousDueDate,
    newDueDate: newDueDate
  });
  
  // Update due date and renewal count
  this.dueDate = newDueDate;
  this.renewalCount += 1;
  
  return true;
};

// Pre-save hook to update status if overdue
borrowRecordSchema.pre('save', function(next) {
  if (this.isModified('dueDate') || this.isNew) {
    if (this.isOverdue() && this.status === 'borrowed') {
      this.status = 'overdue';
    }
  }
  
  if (this.isModified('status') && this.status === 'returned' && !this.returnDate) {
    this.returnDate = new Date();
  }
  
  next();
});

// Create indexes for frequently queried fields
borrowRecordSchema.index({ user: 1, status: 1 });
borrowRecordSchema.index({ book: 1, status: 1 });
borrowRecordSchema.index({ dueDate: 1, status: 1 });
borrowRecordSchema.index({ transactionId: 1 });

// Export the model
const BorrowRecord = mongoose.model('BorrowRecord', borrowRecordSchema);
module.exports = BorrowRecord;