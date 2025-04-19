# CRUD Implementation for BRK Backend

This document provides an overview of the CRUD (Create, Read, Update, Delete) operations implemented for all entities in the BRK Backend system.

## Architecture

The CRUD operations follow a layered architecture:

1. **Controllers**: Handle HTTP requests and route them to the appropriate services
2. **Services**: Implement business logic and interact with repositories 
3. **Repositories**: Provide data access and persistence operations
4. **DTOs (Data Transfer Objects)**: Validate input and format output data
5. **Entities**: Define the data models

## Implementation Details

### Base Classes

- `BaseEntity`: Provides common fields for all entities (id, createdAt, updatedAt)
- `BaseDto`: Includes validation logic and data transformation
- `BaseRepository`: Defines the interface for CRUD operations
- `BaseRepositoryImpl`: Implements CRUD operations using TypeORM
- `BaseService`: Provides generic service methods for CRUD operations
- `BaseCrudController`: Implements standard CRUD endpoints with role-based access control

### Initialization Order

When implementing controllers, it's important to follow the correct initialization order:

1. Call the parent constructor with `super(path)`
2. Set up required properties like service and DTOs
3. Call `this.initializeRoutes()` to initialize routes

This order ensures that all required properties are properly initialized before routes are registered.

### Validation

- Input validation using `class-validator` library
- Custom validation middleware to process validation errors
- DTOs with validation decorators for all entities

### Error Handling

- Custom HTTP exception class
- Error middleware for consistent error response format
- Try-catch blocks in controllers and services to handle exceptions

### Security

- Role-based access control for all CRUD operations
- Authentication middleware to secure endpoints
- JWT-based authentication with refresh tokens

## Entities with CRUD Operations

The following entities have been implemented with full CRUD capabilities:

1. User
2. Championship
3. Club
4. Season
5. Stage
6. Category
7. Fleet
8. Heat
9. Pilot
10. Result
11. Penalty
12. Organizer
13. Administrator
14. Venue
15. KartingTrack

## How to Use

### Example: Creating a User

```typescript
// Controller
this.router.post('/', 
  authMiddleware, 
  roleMiddleware([UserRole.ADMINISTRATOR]), 
  validationMiddleware(CreateUserDto), 
  this.create.bind(this)
);

// Service
async create(userData: Partial<User>): Promise<User> {
  // Business logic, validation, etc.
  return this.repository.create(userData);
}

// Repository
async create(item: DeepPartial<T>): Promise<T> {
  const newItem = this.repository.create(item);
  return this.repository.save(newItem);
}
```

## Code Generation

Two scripts were created to automate CRUD generation:

1. `scripts/generate-crud.js`: Generates CRUD code for a single entity
2. `scripts/generate-all.js`: Generates CRUD code for all entities

To generate CRUD code for a new entity:

```bash
node scripts/generate-crud.js EntityName
```