# Node.js MongoDB – User Authentication & Authorization with Extended Profile

## Features
1. **User Authentication**
   - Registration with username, email, password, address, and phone number
   - Login with JWT token authentication
   - Role-based authorization (User, Moderator, Admin)

2. **User Profile Management**
   - Store user's address and phone number
   - Update profile information via API endpoint
   - Secure profile updates with JWT authentication

## System Architecture

### Database Schema
The MongoDB user model includes the following fields:
```javascript
{
  username: String,
  email: String,
  password: String, // Hashed using bcrypt
  address: String,  // New field
  phoneNumber: String, // New field
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    }
  ]
}
```

### API Endpoints
1. **Authentication Endpoints**
   - POST `/api/auth/signup` - Register new user
   - POST `/api/auth/signin` - Login user
   
2. **User Profile Endpoints**
   - PUT `/api/user/profile` - Update user profile (requires JWT token)
   
3. **Test Endpoints**
   - GET `/api/test/all` - Public access
   - GET `/api/test/user` - User access
   - GET `/api/test/mod` - Moderator access
   - GET `/api/test/admin` - Admin access

### Security Features
1. **JWT Authentication**
   - Tokens required for protected routes
   - Token verification middleware
   
2. **CORS Protection**
   - Configured for localhost development
   - Customizable origin settings

3. **Password Security**
   - Passwords hashed using bcrypt
   - Salt rounds: 8

4. **Content Security Policy**
   - Strict CSP headers
   - Protected against XSS attacks

## API Documentation

### Authentication APIs

#### 1. Register New User
- **Endpoint**: `POST /api/auth/signup`
- **Description**: Register a new user with profile information
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "yourpassword",
    "address": "123 Main St",
    "phoneNumber": "555-0123",
    "roles": ["user"]  // Optional, defaults to ["user"]
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "User was registered successfully!"
  }
  ```
- **Error Responses**:
  - 400: "Username is already in use!"
  - 400: "Email is already in use!"
  - 500: Internal Server Error

#### 2. User Login
- **Endpoint**: `POST /api/auth/signin`
- **Description**: Authenticate user and get JWT token
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "password": "yourpassword"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "roles": ["ROLE_USER"],
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error Responses**:
  - 404: "User Not found."
  - 401: "Invalid Password!"
  - 500: Internal Server Error

### User Profile APIs

#### 1. Update User Profile
- **Endpoint**: `PUT /api/user/profile`
- **Description**: Update user's address and phone number
- **Authentication**: Required (JWT Token)
- **Headers**:
  ```
  x-access-token: YOUR_JWT_TOKEN
  ```
- **Request Body**:
  ```json
  {
    "address": "New Address",
    "phoneNumber": "New Phone Number"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "username": "johndoe",
      "email": "john@example.com",
      "address": "New Address",
      "phoneNumber": "New Phone Number"
    }
  }
  ```
- **Error Responses**:
  - 401: "No token provided!"
  - 403: "Unauthorized!"
  - 404: "User not found."
  - 500: Internal Server Error

### Test Access APIs

#### 1. Public Content
- **Endpoint**: `GET /api/test/all`
- **Description**: Access public content
- **Authentication**: None
- **Success Response** (200):
  ```json
  {
    "message": "Public Content."
  }
  ```

#### 2. User Content
- **Endpoint**: `GET /api/test/user`
- **Description**: Access user content
- **Authentication**: Required (JWT Token)
- **Headers**:
  ```
  x-access-token: YOUR_JWT_TOKEN
  ```
- **Success Response** (200):
  ```json
  {
    "message": "User Content."
  }
  ```
- **Error Responses**:
  - 401: "No token provided!"
  - 403: "Unauthorized!"

#### 3. Moderator Content
- **Endpoint**: `GET /api/test/mod`
- **Description**: Access moderator content
- **Authentication**: Required (JWT Token + Moderator Role)
- **Headers**:
  ```
  x-access-token: YOUR_JWT_TOKEN
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Moderator Content."
  }
  ```
- **Error Responses**:
  - 401: "No token provided!"
  - 403: "Require Moderator Role!"

#### 4. Admin Content
- **Endpoint**: `GET /api/test/admin`
- **Description**: Access admin content
- **Authentication**: Required (JWT Token + Admin Role)
- **Headers**:
  ```
  x-access-token: YOUR_JWT_TOKEN
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Admin Content."
  }
  ```
- **Error Responses**:
  - 401: "No token provided!"
  - 403: "Require Admin Role!"

### API Testing Examples

#### Using cURL

1. **Register a New User**:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
-H "Content-Type: application/json" \
-d '{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "address": "123 Main St",
  "phoneNumber": "555-0123"
}'
```

2. **Login**:
```bash
curl -X POST http://localhost:3000/api/auth/signin \
-H "Content-Type: application/json" \
-d '{
  "username": "johndoe",
  "password": "password123"
}'
```

3. **Update Profile** (Save token from login response):
```bash
curl -X PUT http://localhost:3000/api/user/profile \
-H "Content-Type: application/json" \
-H "x-access-token: YOUR_JWT_TOKEN" \
-d '{
  "address": "456 New St",
  "phoneNumber": "555-9876"
}'
```

#### Using Postman

1. Create a new collection for your APIs
2. Set up environment variables:
   - `baseUrl`: http://localhost:3000
   - `token`: Your JWT token after login
3. Create requests for each endpoint
4. For authenticated requests, add header:
   - Key: x-access-token
   - Value: {{token}}

### Error Handling

All APIs follow a consistent error response format:
```json
{
  "message": "Error message here"
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Setup Instructions

### Prerequisites
1. **Node.js** - Version 12 or higher
2. **MongoDB** - Version 4.4 or higher
3. **npm** - Latest version recommended

### Installation Steps
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure MongoDB:
   - Edit `app/config/db.config.js`:
     ```javascript
     module.exports = {
       HOST: "localhost",
       PORT: 27017,
       DB: "bezkoder_db"
     };
     ```

3. Start MongoDB service:
   - Windows: Start MongoDB service from Services
   - Linux: `sudo service mongod start`
   - Mac: `brew services start mongodb-community`

4. Run the application:
   ```bash
   node server.js
   ```

### Testing the Application
1. **Create a new account:**
   - Visit: http://localhost:3000/signup.html
   - Fill in all required fields including address and phone number
   
2. **Login to your account:**
   - Visit: http://localhost:3000/login.html
   - Use your registered email and password
   
3. **Update Profile:**
   Using curl or Postman:
   ```bash
   curl -X PUT http://localhost:3000/api/user/profile \
   -H "Content-Type: application/json" \
   -H "x-access-token: YOUR_JWT_TOKEN" \
   -d '{
     "address": "New Address",
     "phoneNumber": "New Phone Number"
   }'
   ```

## Troubleshooting

### Common Issues
1. **MongoDB Connection Failed**
   - Verify MongoDB is running
   - Check MongoDB connection string in db.config.js
   - Ensure MongoDB port 27017 is not blocked

2. **JWT Token Issues**
   - Check token expiration
   - Verify token is included in x-access-token header
   - Ensure token is properly formatted

3. **CORS Errors**
   - Check corsOptions in server.js
   - Verify client origin matches server configuration
   - Ensure proper headers are set

### Error Messages
- `MongoDB Connection error`: Check MongoDB service status
- `User validation failed`: Missing required fields
- `Unauthorized`: Invalid or expired JWT token
- `Token not provided`: Missing authentication token

## User Registration, User Login and Authorization process.
The diagram shows flow of how we implement User Registration, User Login and Authorization process.

![jwt-token-authentication-node-js-example-flow](jwt-token-authentication-node-js-example-flow.png)

For more detail, please visit:
> [Node.js + MongoDB: User Authentication & Authorization with JWT](https://www.bezkoder.com/node-js-mongodb-auth-jwt/)

You may need to implement Refresh Token:

![jwt-refresh-token-node-js-example-flow](jwt-refresh-token-node-js-example-flow.png)

> [Node.js JWT Refresh Token with MongoDB example](https://www.bezkoder.com/jwt-refresh-token-node-js-mongodb/)

Working with Front-end:
> [Vue](https://www.bezkoder.com/jwt-vue-vuex-authentication/)

> [Angular 8](https://www.bezkoder.com/angular-jwt-authentication/) / [Angular 10](https://www.bezkoder.com/angular-10-jwt-auth/) / [Angular 11](https://www.bezkoder.com/angular-11-jwt-auth/) / [Angular 12](https://www.bezkoder.com/angular-12-jwt-auth/) / [Angular 13](https://www.bezkoder.com/angular-13-jwt-auth/)

> [React](https://www.bezkoder.com/react-jwt-auth/) / [React + Redux](https://www.bezkoder.com/react-redux-jwt-auth/)

## More Practice:
> [Node.js, Express & MongoDb: Build a CRUD Rest Api example](https://www.bezkoder.com/node-express-mongodb-crud-rest-api/)

> [Server side Pagination in Node.js with MongoDB and Mongoose](https://www.bezkoder.com/node-js-mongodb-pagination/)

> [Node.js Express File Upload Rest API example](https://www.bezkoder.com/node-js-express-file-upload/)

Associations:
> [MongoDB One-to-One relationship tutorial with Mongoose examples](https://www.bezkoder.com/mongoose-one-to-one-relationship-example/)

> [MongoDB One-to-Many Relationship tutorial with Mongoose examples](https://www.bezkoder.com/mongoose-one-to-many-relationship/)

> [MongoDB Many-to-Many Relationship with Mongoose examples](https://www.bezkoder.com/mongodb-many-to-many-mongoose/)

Fullstack:
> [Vue.js + Node.js + Express + MongoDB example](https://www.bezkoder.com/vue-node-express-mongodb-mevn-crud/)

> [Angular 8 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-mongodb-node-express/)

> [Angular 10 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-10-mongodb-node-express/)

> [Angular 11 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-11-mongodb-node-js-express/)

> [Angular 12 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-12-mongodb-node-js-express/)

> [Angular 13 + Node.js + Express + MongoDB example](https://www.bezkoder.com/mean-stack-crud-example-angular-13/)

> [Angular 14 + Node.js + Express + MongoDB example](https://www.bezkoder.com/mean-stack-crud-example-angular-14/)

> [Angular 15 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-15-node-js-express-mongodb/)

> [Angular 16 + Node.js + Express + MongoDB example](https://www.bezkoder.com/angular-16-node-js-express-mongodb/)

> [React + Node.js + Express + MongoDB example](https://www.bezkoder.com/react-node-express-mongodb-mern-stack/)

Integration on same Server/Port:
> [Integrate Vue with Node.js Express](https://www.bezkoder.com/serve-vue-app-express/)

> [Integrate Angular with Node.js Express](https://www.bezkoder.com/integrate-angular-12-node-js/)

> [Integrate React with Node.js Express](https://www.bezkoder.com/integrate-react-express-same-server-port/)

## Project setup
```
npm install
```

### Run
```
node server.js
```

## Complete API Reference

### Authentication System

#### JWT Token Details
- **Token Format**: Bearer token
- **Expiration**: 24 hours
- **Token Contents**:
  ```json
  {
    "id": "user_id",
    "username": "username",
    "roles": ["role_names"],
    "iat": "issued_at_timestamp",
    "exp": "expiration_timestamp"
  }
  ```

#### Password Requirements
- Minimum 6 characters
- Maximum 40 characters
- No special validation rules enforced

### Detailed API Endpoints

#### 1. User Registration
**Endpoint**: `POST /api/auth/signup`
- **Rate Limit**: 5 requests per IP per minute
- **Validation Rules**:
  - Username: 3-20 characters, alphanumeric
  - Email: Valid email format
  - Password: 6-40 characters
  - Address: Optional, max 100 characters
  - Phone: Optional, no format enforced
- **Request Headers**:
  ```
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "address": "string",     // optional
    "phoneNumber": "string", // optional
    "roles": ["string"]      // optional, defaults to ["user"]
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "User was registered successfully!"
  }
  ```
- **Error Responses**:
  ```json
  {
    "message": "Error message",
    "errors": [
      {
        "field": "field_name",
        "message": "validation_message"
      }
    ]
  }
  ```
- **Implementation Notes**:
  - Passwords are hashed using bcrypt (8 rounds)
  - Duplicate username/email check before creation
  - Role validation against existing roles
  - Transaction used for role assignment

#### 2. User Login
**Endpoint**: `POST /api/auth/signin`
- **Rate Limit**: 10 requests per IP per minute
- **Validation Rules**:
  - Username: Required
  - Password: Required
- **Request Headers**:
  ```
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "roles": ["string"],
    "accessToken": "string",
    "address": "string",      // if exists
    "phoneNumber": "string"   // if exists
  }
  ```
- **Implementation Notes**:
  - Failed login attempts are logged
  - Token generation uses environment secret
  - Session handling is stateless

#### 3. Update User Profile
**Endpoint**: `PUT /api/user/profile`
- **Rate Limit**: 30 requests per user per hour
- **Authentication**: Required
- **Validation Rules**:
  - Address: Max 100 characters
  - Phone: Max 20 characters
- **Request Headers**:
  ```
  Content-Type: application/json
  x-access-token: string
  ```
- **Request Body**:
  ```json
  {
    "address": "string",     // optional
    "phoneNumber": "string"  // optional
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "username": "string",
      "email": "string",
      "address": "string",
      "phoneNumber": "string"
    }
  }
  ```
- **Implementation Notes**:
  - Partial updates supported
  - Field sanitization performed
  - Update history logged

### Role-Based Access Control

#### Role Hierarchy
1. **User** (Default)
   - Access own profile
   - Update own information
   - Access public content

2. **Moderator**
   - All User permissions
   - Access moderator content
   - View user statistics

3. **Admin**
   - All Moderator permissions
   - Access admin content
   - System management

#### Permission Endpoints

##### 1. Public Access
**Endpoint**: `GET /api/test/all`
- **Rate Limit**: 100 requests per IP per hour
- **Cache**: 5 minutes
- **Response**: Public content string

##### 2. User Access
**Endpoint**: `GET /api/test/user`
- **Rate Limit**: 100 requests per user per hour
- **Authentication**: JWT Required
- **Cache**: None
- **Response**: User-specific content

##### 3. Moderator Access
**Endpoint**: `GET /api/test/mod`
- **Rate Limit**: 200 requests per user per hour
- **Authentication**: JWT + Moderator Role
- **Cache**: None
- **Response**: Moderator content

##### 4. Admin Access
**Endpoint**: `GET /api/test/admin`
- **Rate Limit**: 300 requests per user per hour
- **Authentication**: JWT + Admin Role
- **Cache**: None
- **Response**: Admin content

### Security Implementations

#### 1. Request Validation
- Input sanitization on all endpoints
- XSS protection headers
- SQL injection prevention
- Request size limits

#### 2. Authentication Security
- Token expiration
- Secure token storage
- Password hashing
- Role verification

#### 3. Rate Limiting
- IP-based limiting
- User-based limiting
- Endpoint-specific limits
- Burst allowance

#### 4. Error Handling
- Standardized error responses
- Detailed validation errors
- Security error masking
- Error logging

### API Testing

#### Postman Collection
```json
{
  "info": {
    "name": "User Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/signup",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"username\":\"test\",\"email\":\"test@example.com\",\"password\":\"password123\",\"address\":\"123 St\",\"phoneNumber\":\"555-0123\"}"
        }
      }
    }
  ]
}
```

### Implementation Best Practices

#### 1. Error Handling
```javascript
try {
  // API logic
} catch (err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: "Validation Error",
      errors: formatValidationErrors(err)
    });
  }
  // Log error for internal tracking
  logger.error(err);
  return res.status(500).json({
    message: "Internal server error"
  });
}
```

#### 2. Request Validation
```javascript
const validateUser = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];
  
  if (!username || username.length < 3) {
    errors.push({
      field: 'username',
      message: 'Username must be at least 3 characters'
    });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};
```

#### 3. Token Verification
```javascript
const verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];
  
  if (!token) {
    return res.status(403).json({
      message: "No token provided!"
    });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: "Unauthorized!"
      });
    }
    req.userId = decoded.id;
    next();
  });
};
