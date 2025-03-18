const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Configuration
const config = {
  mongoURI: 'mongodb://localhost:27017/library_management',
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
  membershipStartDate: { type: Date, default: Date.now },
  membershipEndDate: { type: Date, required: true },
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

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  bookIsbn: { type: String, required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date, default: null },
  status: { type: String, enum: ['borrowed', 'returned'], default: 'borrowed' }
});

// Fine Schema
const fineSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  paymentDate: { type: Date, default: null }
});

// Create models
const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Fine = mongoose.model('Fine', fineSchema);

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
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    return true;
  } catch (err) {
    console.error('Failed to disconnect from MongoDB:', err);
    return false;
  }
}

// Clear test data
async function clearTestData() {
  console.log('Clearing test data...');
  try {
    await User.deleteMany({ email: /test@/ });
    await Book.deleteMany({ title: /Test Book/ });
    await Transaction.deleteMany({});
    await Fine.deleteMany({});
    console.log('Test data cleared\n');
  } catch (err) {
    console.error('❌ Failed to clear test data:', err);
  }
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
      membershipStartDate: new Date(),
      membershipEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      currentBorrowCount: 0,
      maxBorrowLimit: 5
    });

    await testUser.save();
    console.log(`User created: ${testUser.userId}`);
    
    // Check if membership is valid
    const today = new Date();
    const membershipValid = today <= testUser.membershipEndDate;
    console.log(`Membership valid: ${membershipValid}`);
    
    // Calculate days remaining in membership
    const daysRemaining = Math.ceil((testUser.membershipEndDate - today) / (1000 * 60 * 60 * 24));
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
      isbn: `TEST-${Math.floor(Math.random() * 10000)}`,
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

    // Create transaction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days from now

    const transaction = new Transaction({
      transactionId: generateUniqueId('TXN'),
      userId: user.userId,
      bookIsbn: book.isbn,
      borrowDate: new Date(),
      dueDate: dueDate,
      returnDate: null,
      status: 'borrowed'
    });

    await transaction.save();

    // Update book quantity
    book.availableQuantity -= 1;
    await book.save();

    // Update user borrow count
    user.currentBorrowCount += 1;
    await user.save();

    console.log(`Transaction created: ${transaction.transactionId}`);
    console.log(`Book "${book.title}" borrowed by ${user.name}`);
    console.log(`Due date: ${dueDate.toDateString()}`);
    console.log(`Updated available quantity: ${book.availableQuantity}/${book.quantity}`);
    console.log(`Updated user borrow count: ${user.currentBorrowCount}/${user.maxBorrowLimit}\n`);

    return transaction;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return null;
  }
}

// Test book returning
async function testBookReturning(transaction, user, book) {
  console.log('Testing book returning...');
  try {
    // Check if transaction, user and book exist
    if (!transaction || !user || !book) {
      console.error('❌ Transaction, user, or book not available for return test');
      return false;
    }

    // Update transaction
    transaction.returnDate = new Date();
    transaction.status = 'returned';
    await transaction.save();

    // Update book quantity
    book.availableQuantity += 1;
    await book.save();

    // Update user borrow count
    user.currentBorrowCount -= 1;
    await user.save();

    console.log(`Book "${book.title}" returned by ${user.name}`);
    console.log(`Return date: ${transaction.returnDate.toDateString()}`);
    console.log(`Updated available quantity: ${book.availableQuantity}/${book.quantity}`);
    console.log(`Updated user borrow count: ${user.currentBorrowCount}/${user.maxBorrowLimit}\n`);

    // Check if book is returned late
    const daysLate = Math.ceil((transaction.returnDate - transaction.dueDate) / (1000 * 60 * 60 * 24));
    
    if (daysLate > 0) {
      console.log(`Book returned ${daysLate} days late. Testing fine generation...`);
      
      // Create fine (for testing, we'll simulate a fine even if it's not late)
      const fineAmount = daysLate * 0.5; // $0.50 per day
      const fine = new Fine({
        userId: user.userId,
        transactionId: transaction.transactionId,
        amount: fineAmount > 0 ? fineAmount : 0.5, // Minimum fine for testing
        reason: 'Late return',
        date: new Date(),
        status: 'unpaid'
      });

      await fine.save();
      console.log(`Fine generated: $${fine.amount.toFixed(2)}\n`);

      // Test fine payment
      await testFinePayment(fine);
    } else {
      // For testing purposes, we'll create a fine anyway
      console.log(`Book returned on time. Creating test fine anyway...`);
      const fine = new Fine({
        userId: user.userId,
        transactionId: transaction.transactionId,
        amount: 0.5, // Minimum fine for testing
        reason: 'Test fine',
        date: new Date(),
        status: 'unpaid'
      });

      await fine.save();
      console.log(`Test fine generated: $${fine.amount.toFixed(2)}\n`);

      // Test fine payment
      await testFinePayment(fine);
    }

    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Test fine payment
async function testFinePayment(fine) {
  console.log('Testing fine payment...');
  try {
    // Update fine status
    fine.status = 'paid';
    fine.paymentDate = new Date();
    await fine.save();

    console.log(`Fine paid: $${fine.amount.toFixed(2)}`);
    console.log(`Payment date: ${fine.paymentDate.toDateString()}\n`);

    return true;
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
        isbn: `TEST-${Math.floor(Math.random() * 10000)}`,
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
        isbn: `TEST-${Math.floor(Math.random() * 10000)}`,
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

// Test user membership renewal
async function testMembershipRenewal(user) {
  console.log('Testing membership renewal...');
  try {
    if (!user) {
      console.error('❌ User not available for membership renewal test');
      return false;
    }

    // Get original end date
    const originalEndDate = new Date(user.membershipEndDate);
    console.log(`Original membership end date: ${originalEndDate.toDateString()}`);

    // Extend membership by 6 months
    user.membershipEndDate = new Date(user.membershipEndDate);
    user.membershipEndDate.setMonth(user.membershipEndDate.getMonth() + 6);
    await user.save();

    console.log(`Membership renewed. New end date: ${user.membershipEndDate.toDateString()}`);
    
    // Calculate new days remaining
    const today = new Date();
    const daysRemaining = Math.ceil((user.membershipEndDate - today) / (1000 * 60 * 60 * 24));
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
    const collections = ['users', 'books', 'transactions', 'fines'];
    
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
      const transaction = await testBookBorrowing(user, book);
      
      if (transaction) {
        await testBookReturning(transaction, user, book);
      }
      
      await testBookSearch();
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