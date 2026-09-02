# Bookmarks World — Backend

Backend API for Bookmarks World, a full-stack bookmark-sharing platform.

The backend handles authentication, authorization, bookmarks, collections,
groups, and other application workflows through REST APIs.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- TypeScript
- JWT Authentication

## Key Features

- User authentication and authorization
- Access and refresh token flow
- Bookmark management
- Public and private bookmarks
- Collections
- Group-based collaboration
- Authorization checks for protected resources
- RESTful API architecture

## Authentication

The application uses access and refresh tokens for authentication.

When an access token expires, the client can use the refresh token to
obtain a new access token without requiring the user to log in again.

## Project Structure

```text
src/
├── config/          # Application and database configuration
├── controllers/     # Request handling and business logic
├── middleware/      # Authentication and request middleware
├── models/          # MongoDB/Mongoose models
├── routes/          # API routes
├── types/           # TypeScript types
├── utils/           # Shared utility functions
├── seed.ts          # Database seed functionality
└── server.ts        # Application entry point
