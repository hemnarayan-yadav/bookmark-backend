# Bookmarks World — Backend

Backend API for **Bookmarks World**, a full-stack bookmark-sharing platform
for organizing, sharing, and collaborating on bookmarks.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT
- Zod
- Express Validator

## Key Features

- User authentication and authorization
- Access token and refresh token flow
- Bookmark management
- Public and private bookmarks
- Collection management
- Shared collections and collaboration
- Favorites
- Tags
- User management
- Bookmark and collection statistics
- Protected API routes
- Request validation
- Password hashing

## Authentication

The application uses access and refresh tokens for authentication.

When an access token expires, the client can use the refresh token to obtain
a new access token without requiring the user to log in again.

## Project Structure

src/
├── config/          # Application and database configuration
├── controllers/     # Request handling
├── middleware/      # Authentication and request middleware
├── models/          # MongoDB/Mongoose models
├── routes/          # API routes
├── types/           # TypeScript types
├── utils/           # Shared utility functions
├── seed.ts          # Database seed functionality
└── server.ts        # Application entry point

## API Modules

The backend provides API routes for:

- Authentication
- Users
- Bookmarks
- Collections
- Favorites
- Tags
- Public content
- Statistics

## Getting Started

### Prerequisites

- Node.js 20.x
- MongoDB

### Installation

```bash
npm install
