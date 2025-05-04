
# Library Management System

A full-featured Library Management System built with **Node.js**, **Express**, and **MongoDB**. This system allows you to manage books, users, and borrowing transactions, including overdue tracking and fine management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Books](#books)
  - [Users](#users)
  - [Borrow/Transactions](#borrowtransactions)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

- Book management (CRUD, search, filtering, pagination)
- User management (CRUD, membership, preferences)
- Borrowing and returning books, renewals, overdue tracking
- Fine calculation and payment
- RESTful API with validation and error handling
- MongoDB text search for books and users
- Ready for integration with a frontend (basic HTML template included)

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)
- **Validation:** Joi
- **Other:** dotenv, cors, body-parser, nodemon (dev)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd library-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory with the following content:

```
MONGO_URI=mongodb://localhost:27017/library_management
PORT=3000
```

- `MONGO_URI`: MongoDB connection string (adjust as needed)
- `PORT`: Port for the server (default: 3000)

### Running the Application

Start the server in development mode (with auto-reload):

```bash
npm start
```

The API will be available at: [http://localhost:3000](http://localhost:3000)

You can also open the included HTML UI at [http://localhost:3000/index.html](http://localhost:3000/index.html) (if using the provided `public/` folder).

---

## API Documentation

All endpoints are prefixed with `/api`.

### Books

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| GET    | `/api/books`            | List all books (with filters, pagination, sorting) |
| GET    | `/api/books/:id`        | Get a book by ID                   |
| POST   | `/api/books`            | Create a new book                  |
| PUT    | `/api/books/:id`        | Update a book                      |
| DELETE | `/api/books/:id`        | Delete a book                      |
| GET    | `/api/books/search`     | Search books by text (`q` param)   |

**Book Object Example:**
```json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "978-3-16-148410-0",
  "publishedYear": 1925,
  "genre": ["Fiction", "Classic"],
  "quantity": 5,
  "availableQuantity": 5,
  "description": "A novel set in the Roaring Twenties.",
  "location": { "shelf": "A3", "section": "Literature" },
  "coverImage": "https://example.com/gatsby.jpg"
}
```

### Users

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| GET    | `/api/users`            | List all users (with filters, pagination) |
| GET    | `/api/users/:id`        | Get a user by ID                   |
| POST   | `/api/users`            | Create a new user                  |
| PUT    | `/api/users/:id`        | Update a user                      |
| DELETE | `/api/users/:id`        | Delete a user                      |
| GET    | `/api/users/search`     | Search users by text (`q` param)   |

**User Object Example:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Metropolis",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "membershipType": "regular",
  "preferences": {
    "receiveNotifications": true,
    "notificationChannel": "email",
    "favoriteGenres": ["Fiction", "Science"]
  }
}
```

### Borrow/Transactions

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/borrow`                         | List all borrow records            |
| GET    | `/api/borrow/overdue`                 | List all overdue books             |
| GET    | `/api/borrow/:id`                     | Get a borrow record by ID          |
| GET    | `/api/borrow/user/:userId`            | Get a user's borrow history        |
| POST   | `/api/borrow`                         | Create a new borrow record (borrow a book) |
| PUT    | `/api/borrow/:id`                     | Update a borrow record             |
| POST   | `/api/borrow/:id/return`              | Return a book                      |
| POST   | `/api/borrow/:id/renew`               | Renew a borrowed book              |
| POST   | `/api/borrow/:id/pay-fine`            | Pay fine for a borrow record       |

**Borrow Record Example:**
```json
{
  "user": "<userId>",
  "book": "<bookId>",
  "borrowDate": "2024-06-01T00:00:00.000Z",
  "dueDate": "2024-06-15T00:00:00.000Z",
  "status": "borrowed",
  "fine": {
    "amount": 0,
    "status": "unpaid"
  },
  "renewalCount": 0,
  "bookCondition": {
    "checkedOut": "good"
  }
}
```

---

## Testing

- **Unit/Integration Tests:**  
  You can run the included test scripts:
  ```bash
  npm test
  ```
  - `test-script.js` adds a test book to your database.
  - `test.js` contains advanced test logic (see file for details).

- **API Testing:**  
  Use [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/) to interact with the API endpoints.

---

## Project Structure

```
library-management-system/
  config/           # Database and environment config
  controllers/      # Route controllers (business logic)
  middlewares/      # Express middlewares (error handling, validation)
  models/           # Mongoose models (Book, User, BorrowRecord)
  public/           # Static files (HTML, CSS, JS)
  routes/           # Express route definitions
  utils/            # Utility functions (API response helpers)
  validation/       # Joi validation schemas
  Server.js         # Main server entry point
  .env              # Environment variables
  package.json      # Project metadata and scripts
  README.md         # Project documentation
```

---

## License

This project is licensed under the [ISC License](LICENSE).

---

**Contributions and suggestions are welcome!**

---

Let me know if you want to include example requests/responses, authentication details, or anything else!
