# BRK Backend

TypeScript-based Node.js backend with Express using clean architecture

## Project Structure

The project follows clean architecture principles:

```
src/
├── controllers/     # Handle HTTP requests and responses
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # Domain entities
├── dtos/            # Data Transfer Objects
├── middleware/      # Express middleware
├── config/          # Application configuration
└── utils/           # Utility functions
```

## Database Setup

This project uses TypeORM with PostgreSQL. You can set up the database in two ways:

### Using Docker Compose (Recommended)

1. Make sure Docker and Docker Compose are installed on your system
2. Run the following command to start PostgreSQL and PgAdmin:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432 (or the port specified in your .env file)
- PgAdmin web interface available at http://localhost:5050 (or the port specified in your .env file)

To stop the containers:

```bash
docker-compose down
```

To stop the containers and remove the volumes (this will delete all data):

```bash
docker-compose down -v
```

### Manual Setup

1. Make sure PostgreSQL is installed and running on your system
2. Create a database named `brk_competition` (or configure environment variables for your database)
3. Configure database connection details in `.env` file

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=brk_competition
DB_SSL=false
```

## Migration Commands

The following commands are available for database migrations:

- `npm run migration:create -- src/migrations/MigrationName` - Create a new migration file
- `npm run migration:generate -- src/migrations/MigrationName` - Generate a migration from entity changes
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert the most recent migration

## Development

To run the application in development mode:

```bash
npm install
npm run dev
```

## Build

To build the application:

```bash
npm run build
```

## Production

To run the application in production mode:

```bash
npm start
```

## License

ISC 