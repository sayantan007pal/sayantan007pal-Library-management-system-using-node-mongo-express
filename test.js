// // Pre-request Script (to set up variables)
// // You can add this script to your Postman request's "Pre-request Script" tab
// const userId = pm.variables.get("validUserId") || "65f1a2b3c4d5e6f7g8h9i0j1";
// const bookId = pm.variables.get("availableBookId") || "65f7a2b3c4d5e6f7g8h9i0j2";
// pm.variables.set("userId", userId);
// pm.variables.set("bookId", bookId);
// pm.variables.set("dueDate", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Due date 14 days from now


// // Tests (add this to Postman's "Tests" tab)
// // Main test for successful borrowing
// pm.test("Successful borrowing returns 201 status code", function() {
//     pm.response.to.have.status(201);
// });

// pm.test("Response has the correct structure", function() {
//     const jsonData = pm.response.json();
    
//     pm.expect(jsonData).to.have.property("success");
//     pm.expect(jsonData.success).to.be.true;
    
//     pm.expect(jsonData).to.have.property("message");
//     pm.expect(jsonData.message).to.equal("Book borrowed successfully");
    
//     pm.expect(jsonData).to.have.property("data");
//     pm.expect(jsonData.data).to.be.an("object");
// });

// pm.test("Borrow record has the expected properties", function() {
//     const jsonData = pm.response.json();
    
//     pm.expect(jsonData.data).to.have.property("transactionId");
//     pm.expect(jsonData.data.transactionId).to.be.a("string");
//     pm.expect(jsonData.data.transactionId).to.include("TXN-");
    
//     pm.expect(jsonData.data).to.have.property("user");
//     pm.expect(jsonData.data.user).to.equal(pm.variables.get("userId"));
    
//     pm.expect(jsonData.data).to.have.property("book");
//     pm.expect(jsonData.data.book).to.equal(pm.variables.get("bookId"));
    
//     pm.expect(jsonData.data).to.have.property("dueDate");
    
//     pm.expect(jsonData.data).to.have.property("bookCondition");
//     pm.expect(jsonData.data.bookCondition).to.have.property("checkedOut");
    
//     // Store the transaction ID for future tests if needed
//     if (jsonData.data.transactionId) {
//         pm.environment.set("lastTransactionId", jsonData.data.transactionId);
//     }
// });

// // Additional test collection for error cases
// // You would create separate Postman requests for each of these cases

// // Test Case: Invalid User ID
// // (For a separate request with an invalid userId)
// if (pm.variables.get("testCase") === "invalidUser") {
//     pm.test("Invalid user ID returns 404", function() {
//         pm.response.to.have.status(404);
//         const jsonData = pm.response.json();
//         pm.expect(jsonData.success).to.be.false;
//         pm.expect(jsonData.message).to.equal("User not found");
//     });
// }

// // Test Case: Invalid Book ID
// // (For a separate request with an invalid bookId)
// if (pm.variables.get("testCase") === "invalidBook") {
//     pm.test("Invalid book ID returns 404", function() {
//         pm.response.to.have.status(404);
//         const jsonData = pm.response.json();
//         pm.expect(jsonData.success).to.be.false;
//         pm.expect(jsonData.message).to.equal("Book not found");
//     });
// }

// // Test Case: Book not available
// // (For a separate request with a book that's already borrowed)
// if (pm.variables.get("testCase") === "unavailableBook") {
//     pm.test("Unavailable book returns 400", function() {
//         pm.response.to.have.status(400);
//         const jsonData = pm.response.json();
//         pm.expect(jsonData.success).to.be.false;
//         pm.expect(jsonData.message).to.equal("Book is not available for borrowing");
//     });
// }

// // Test Case: User has unpaid fines
// // (For a separate request with a user that has unpaid fines)
// if (pm.variables.get("testCase") === "unpaidFines") {
//     pm.test("User with unpaid fines returns 400", function() {
//         pm.response.to.have.status(400);
//         const jsonData = pm.response.json();
//         pm.expect(jsonData.success).to.be.false;
//         pm.expect(jsonData.message).to.include("User has unpaid fines");
//         pm.expect(jsonData).to.have.property("unpaidFines");
//         pm.expect(jsonData.unpaidFines).to.be.an("array");
//     });
// }

// // Test Case: Server error
// // (For a separate request that might trigger a server error)
// if (pm.variables.get("testCase") === "serverError") {
//     pm.test("Server error returns 500", function() {
//         pm.response.to.have.status(500);
//         const jsonData = pm.response.json();
//         pm.expect(jsonData.success).to.be.false;
//         pm.expect(jsonData).to.have.property("error");
//     });
// }









const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Import the BorrowRecord model
const BorrowRecord = require('./models/borrowModel');

// Configuration
const config = {
  mongoURI: 'mongodb://localhost:27017/MERN_STACK_LIBRARY_MANAGEMENT_SYSTEM',
  testMode: true
};

// ====== MODEL DEFINITIONS ======

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  membershipType: {
    type: String,
    required: true,
    enum: ['regular', 'premium', 'student', 'staff'],
    default: 'regular',
  },
  membershipDate: { type: Date, default: Date.now },
  membershipExpiry: {
    type: Date,
    default: function () {
      return new Date(this.membershipDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
  },
  currentBorrowCount: { type: Number, default: 0 },
  maxBorrowLimit: { type: Number, default: 5 }
});

// Book Schema
const bookSchema = new mongoose.Schema({
  isbn: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  publisher: { type: String, required: true },
  publishYear: { type: Number, required: true },
  genre: { type: [String], required: true }, // Array of strings for genre
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  availableQuantity: { type: Number, required: true },
  location: { type: String, required: true }
});

// Create models
const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);

// ====== HELPER FUNCTIONS ======

// Helper function for generating unique IDs
const generateUniqueId = (prefix) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

// Connect to MongoDB
async function connectToMongoDB() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB successfully\n');
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    return false;
  }
}

// Disconnect from MongoDB
async function disconnectFromMongoDB() {
  // try {
  //   await mongoose.disconnect();
  //   console.log('Disconnected from MongoDB');
  //   return true;
  // } catch (err) {
  //   console.error('Failed to disconnect from MongoDB:', err);
  //   return false;
  // }
}

// Clear test data
async function clearTestData() {
  // console.log('Clearing test data...');
  // try {
  //   await User.deleteMany({ email: /test@/ });
  //   await Book.deleteMany({ title: /Test Book/ });
  //   await BorrowRecord.deleteMany({});
  //   console.log('Test data cleared\n');
  // } catch (err) {
  //   console.error('❌ Failed to clear test data:', err);
  // }
}

// ====== TEST FUNCTIONS ======

// Test user creation
async function testUserCreation() {
  console.log('Testing user creation...');
  try {
    const userId = generateUniqueId('LIB-U');
    const testUser = new User({
      userId: userId,
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: '123 Test Street, Test City',
      membershipDate: new Date(),
      membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      currentBorrowCount: 0,
      maxBorrowLimit: 5
    });

    await testUser.save();
    console.log(`User created: ${testUser.userId}`);
    
    // Check if membership is valid
    const today = new Date();
    const membershipValid = today <= testUser.membershipExpiry;
    console.log(`Membership valid: ${membershipValid}`);
    
    // Calculate days remaining in membership
    const daysRemaining = Math.ceil((testUser.membershipExpiry - today) / (1000 * 60 * 60 * 24));
    console.log(`Membership days remaining: ${daysRemaining}`);
    console.log(`Current borrow count: ${testUser.currentBorrowCount}\n`);

    return testUser;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return null;
  }
}

// Test book creation
async function testBookCreation() {
  console.log('Testing book creation...');
  try {
    const testBook = new Book({
      isbn: `TEST-${Math.floor(Math.random() * 10000)}-${Date.now().toString().slice(-4)}`,
      title: 'Test Book 1',
      author: 'Test Author',
      publisher: 'Test Publisher',
      publishYear: 2023,
      genre: ['Fiction', 'Test'], // Array of strings for genre
      description: 'This is a test book for the library management system.',
      quantity: 5,
      availableQuantity: 5,
      location: 'Section A, Shelf 2'
    });

    await testBook.save();
    console.log(`Book created: ${testBook.title} (ISBN: ${testBook.isbn})`);
    console.log(`Available quantity: ${testBook.availableQuantity}/${testBook.quantity}\n`);

    return testBook;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return null;
  }
}

// Test book borrowing
async function testBookBorrowing(user, book) {
  console.log('Testing book borrowing...');
  try {
    // Check if user and book exist
    if (!user || !book) {
      console.error('❌ User or book not available for borrowing test');
      return null;
    }

    // Check if book is available
    if (book.availableQuantity <= 0) {
      console.error('❌ Book not available for borrowing');
      return null;
    }

    // Check if user can borrow more books
    if (user.currentBorrowCount >= user.maxBorrowLimit) {
      console.error('❌ User has reached maximum borrow limit');
      return null;
    }

    // Create due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create borrow record using the new schema
    const borrowRecord = new BorrowRecord({
      user: user._id,
      book: book._id,
      dueDate: dueDate,
      status: 'borrowed',
      bookCondition: {
        checkedOut: 'good'
      }
    });

    await borrowRecord.save();

    // Update book quantity
    book.availableQuantity -= 1;
    await book.save();

    // Update user borrow count
    user.currentBorrowCount += 1;
    await user.save();

    console.log(`Transaction created: ${borrowRecord.transactionId}`);
    console.log(`Book "${book.title}" borrowed by ${user.name}`);
    console.log(`Due date: ${dueDate.toDateString()}`);
    console.log(`Updated available quantity: ${book.availableQuantity}/${book.quantity}`);
    console.log(`Updated user borrow count: ${user.currentBorrowCount}/${user.maxBorrowLimit}`);
    console.log(`Days remaining: ${borrowRecord.daysRemaining}\n`);

    return borrowRecord;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return null;
  }
}

// Test book renewal
async function testBookRenewal(borrowRecord) {
  console.log('Testing book renewal...');
  try {
    if (!borrowRecord) {
      console.error('❌ Borrow record not available for renewal test');
      return false;
    }

    // Get original due date for comparison
    const originalDueDate = new Date(borrowRecord.dueDate);
    console.log(`Original due date: ${originalDueDate.toDateString()}`);

    // Use the model's renewBook method
    const renewalSuccess = borrowRecord.renewBook();
    
    if (renewalSuccess) {
      await borrowRecord.save();
      console.log(`Book renewed successfully`);
      console.log(`New due date: ${borrowRecord.dueDate.toDateString()}`);
      console.log(`Renewal count: ${borrowRecord.renewalCount}`);
      console.log(`Updated days remaining: ${borrowRecord.daysRemaining}\n`);
      return true;
    } else {
      console.log('❌ Book renewal failed - may be overdue or already returned\n');
      return false;
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test book returning
async function testBookReturning(borrowRecord, user, book) {
  console.log('Testing book returning...');
  try {
    // Check if borrow record, user and book exist
    if (!borrowRecord || !user || !book) {
      console.error('❌ Borrow record, user, or book not available for return test');
      return false;
    }

    // Update borrow record
    borrowRecord.status = 'returned';
    borrowRecord.returnDate = new Date();
    borrowRecord.bookCondition.returned = 'good';
    await borrowRecord.save();

    // Update book quantity
    book.availableQuantity += 1;
    await book.save();

    // Update user borrow count
    user.currentBorrowCount -= 1;
    await user.save();

    console.log(`Book returned by ${user.name}`);
    console.log(`Return date: ${borrowRecord.returnDate.toDateString()}`);
    console.log(`Borrow duration: ${borrowRecord.borrowDuration} days`);
    console.log(`Updated available quantity: ${book.availableQuantity}/${book.quantity}`);
    console.log(`Updated user borrow count: ${user.currentBorrowCount}/${user.maxBorrowLimit}`);

    // Check if book is returned late and calculate fine
    const isLate = new Date(borrowRecord.returnDate) > new Date(borrowRecord.dueDate);
    
    if (isLate) {
      // Use the model's calculateFine method
      const fineAmount = borrowRecord.calculateFine();
      console.log(`Book returned late. Fine calculated: $${fineAmount.toFixed(2)}`);
      
      // Set the fine details
      borrowRecord.fine.amount = fineAmount;
      borrowRecord.fine.reason = 'late';
      borrowRecord.fine.date = new Date();
      borrowRecord.fine.status = 'unpaid';
      await borrowRecord.save();
      
      // Test fine payment
      await testFinePayment(borrowRecord);
    } else {
      console.log(`Book returned on time. No fine necessary.\n`);
      
      // For testing purposes, we'll create a fine anyway
      console.log(`Creating test fine anyway...`);
      borrowRecord.fine.amount = 0.5; // Minimum fine for testing
      borrowRecord.fine.reason = 'other';
      borrowRecord.fine.date = new Date();
      borrowRecord.fine.status = 'unpaid';
      await borrowRecord.save();
      
      // Test fine payment
      await testFinePayment(borrowRecord);
    }

    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test fine payment
async function testFinePayment(borrowRecord) {
  console.log('Testing fine payment...');
  try {
    // Use the model's payFine method
    const paymentSuccess = borrowRecord.payFine('cash');
    
    if (paymentSuccess) {
      await borrowRecord.save();
      console.log(`Fine paid: $${borrowRecord.fine.amount.toFixed(2)}`);
      console.log(`Payment method: ${borrowRecord.fine.paymentMethod}`);
      console.log(`Payment date: ${borrowRecord.fine.paidDate.toDateString()}\n`);
      return true;
    } else {
      console.log('❌ Fine payment failed - may already be paid or no fine exists\n');
      return false;
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test book search functionality
async function testBookSearch() {
  console.log('Testing book search functionality...');
  try {
    // Create a few more books for testing search
    const books = [
      {
        isbn: `TEST-${Math.floor(Math.random() * 10000)}-${Date.now().toString().slice(-4)}`,
        title: 'Test Book 2',
        author: 'Jane Doe',
        publisher: 'Test Publisher',
        publishYear: 2022,
        genre: ['Science Fiction', 'Adventure'],
        description: 'A sci-fi adventure for testing search functionality.',
        quantity: 3,
        availableQuantity: 3,
        location: 'Section B, Shelf 1'
      },
      {
        isbn: `TEST-${Math.floor(Math.random() * 10000)}-${Date.now().toString().slice(-4)}`,
        title: 'Advanced Testing',
        author: 'John Smith',
        publisher: 'Code Books',
        publishYear: 2021,
        genre: ['Technical', 'Education'],
        description: 'Learn advanced testing techniques.',
        quantity: 2,
        availableQuantity: 2,
        location: 'Section C, Shelf 3'
      }
    ];

    // Save the books
    for (const bookData of books) {
      const book = new Book(bookData);
      await book.save();
      console.log(`Additional book created: ${book.title}`);
    }

    // Test search by title
    console.log('\nSearching for books with "Test" in the title:');
    const titleResults = await Book.find({ title: /Test/ });
    console.log(`Found ${titleResults.length} books:`);
    titleResults.forEach(book => {
      console.log(`- ${book.title} by ${book.author} (${book.isbn})`);
    });

    // Test search by author
    console.log('\nSearching for books by "John Smith":');
    const authorResults = await Book.find({ author: 'John Smith' });
    console.log(`Found ${authorResults.length} books:`);
    authorResults.forEach(book => {
      console.log(`- ${book.title} by ${book.author} (${book.isbn})`);
    });

    // Test search by genre
    console.log('\nSearching for books in "Science Fiction" genre:');
    const genreResults = await Book.find({ genre: 'Science Fiction' });
    console.log(`Found ${genreResults.length} books:`);
    genreResults.forEach(book => {
      console.log(`- ${book.title} by ${book.author} (${book.isbn})`);
    });

    console.log('\nBook search testing completed\n');
    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test finding overdue books using BorrowRecord static method
async function testFindOverdueBooks() {
  console.log('Testing find overdue books functionality...');
  try {
    // Create a book and user for this test
    const overdueUser = new User({
      userId: generateUniqueId('LIB-U'),
      name: 'Overdue Test User',
      email: 'overdue.test@example.com',
      phone: '9876543210',
      address: '456 Overdue Street, Test City',
      membershipType: 'regular',
      currentBorrowCount: 1,
      maxBorrowLimit: 5
    });
    await overdueUser.save();

    const overdueBook = new Book({
      isbn: `TEST-OD-${Math.floor(Math.random() * 10000)}`,
      title: 'Overdue Test Book',
      author: 'Test Author',
      publisher: 'Test Publisher',
      publishYear: 2023,
      genre: ['Fiction', 'Test'],
      description: 'This is a test book for testing overdue functionality.',
      quantity: 1,
      availableQuantity: 0,
      location: 'Section A, Shelf 3'
    });
    await overdueBook.save();

    // Create an overdue borrow record
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 7); // 7 days in the past

    const overdueBorrowRecord = new BorrowRecord({
      user: overdueUser._id,
      book: overdueBook._id,
      borrowDate: new Date(pastDueDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 21 days ago
      dueDate: pastDueDate, // 7 days ago
      status: 'borrowed'
    });
    await overdueBorrowRecord.save();

    console.log(`Created overdue record: Book "${overdueBook.title}" borrowed by ${overdueUser.name}`);
    console.log(`Due date was: ${pastDueDate.toDateString()} (${overdueBorrowRecord.daysRemaining} days remaining)`);

    // Find overdue books using the static method
    console.log('\nFinding all overdue books:');
    const overdueBooks = await BorrowRecord.findOverdueBooks();
    
    console.log(`Found ${overdueBooks.length} overdue books:`);
    for (const record of overdueBooks) {
      console.log(`- "${record.book.title}" borrowed by ${record.user.name}`);
      console.log(`  Due date: ${record.dueDate.toDateString()}`);
      console.log(`  Days overdue: ${Math.abs(record.daysRemaining)}`);
      console.log(`  Estimated fine: $${record.calculateFine().toFixed(2)}`);
    }

    console.log('\nOverdue books test completed\n');
    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test fine report generation using BorrowRecord static method
async function testFineReportGeneration() {
  console.log('Testing fine report generation...');
  try {
    // Generate a report for all fines in the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    console.log(`Generating fine report from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    const fineReport = await BorrowRecord.generateFineReport(startDate, endDate);
    
    console.log('\nFine Report Summary:');
    if (fineReport.length === 0) {
      console.log('No fine data available for the selected period');
    } else {
      fineReport.forEach(group => {
        console.log(`- Status: ${group._id || 'Not specified'}`);
        console.log(`  Count: ${group.count} fines`);
        console.log(`  Total amount: $${group.totalAmount.toFixed(2)}`);
      });
    }

    console.log('\nFine report generation test completed\n');
    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test user membership renewal
async function testMembershipRenewal(user) {
  console.log('Testing membership renewal...');
  try {
    if (!user) {
      console.error('❌ User not available for membership renewal test');
      return false;
    }

    // Get original end date
    const originalEndDate = new Date(user.membershipExpiry);
    console.log(`Original membership end date: ${originalEndDate.toDateString()}`);

    // Extend membership by 6 months
    user.membershipExpiry = new Date(user.membershipExpiry);
    user.membershipExpiry.setMonth(user.membershipExpiry.getMonth() + 6);
    await user.save();

    console.log(`Membership renewed. New end date: ${user.membershipExpiry.toDateString()}`);
    
    // Calculate new days remaining
    const today = new Date();
    const daysRemaining = Math.ceil((user.membershipExpiry - today) / (1000 * 60 * 60 * 24));
    console.log(`Updated membership days remaining: ${daysRemaining}\n`);

    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Generate MongoDB Compass compatible output
async function generateMongoCompassView() {
  console.log('Generating MongoDB Compass view...');
  
  try {
    // Connect directly using MongoClient for raw queries
    const client = new MongoClient(config.mongoURI);
    await client.connect();
    const db = client.db();
    
    // Collections to display
    const collections = ['users', 'books', 'borrowrecords'];
    
    for (const collection of collections) {
      console.log(`\n=== ${collection.toUpperCase()} COLLECTION ===`);
      
      // Get sample documents from each collection (limit to 5)
      const documents = await db.collection(collection).find().limit(5).toArray();
      
      if (documents.length === 0) {
        console.log(`No documents found in ${collection} collection`);
        continue;
      }
      
      // Display documents in a format similar to MongoDB Compass
      documents.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log(JSON.stringify(doc, null, 2));
      });
    }
    
    await client.close();
    console.log('\nMongoDB Compass view generated\n');
    return true;
  } catch (err) {
    console.error('❌ Failed to generate MongoDB Compass view:', err);
    return false;
  }
}

// ====== MAIN EXECUTION ======

// Run all tests
async function runTests() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) return;
    
    // Clear existing test data
    await clearTestData();
    
    // Run tests
    const user = await testUserCreation();
    const book = await testBookCreation();
    
    // Only proceed if previous tests were successful
    if (user && book) {
      const borrowRecord = await testBookBorrowing(user, book);
      
      if (borrowRecord) {
        // Test renewal functionality
        await testBookRenewal(borrowRecord);
        
        // Then test returning
        await testBookReturning(borrowRecord, user, book);
      }
      
      await testBookSearch();
      await testFindOverdueBooks();
      await testFineReportGeneration();
      await testMembershipRenewal(user);
    }
    
    // Generate MongoDB Compass view
    await generateMongoCompassView();
    
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
  } catch (err) {
    console.error('❌ Test execution failed:', err);
    
    // Ensure we disconnect even if tests fail
    await disconnectFromMongoDB();
  }
}

// Run the tests
runTests();