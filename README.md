# TypeScript Express.js Backend

A clean architecture TypeScript-based Node.js backend using Express.js.

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

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration

## Development

To run the application in development mode:

```bash
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