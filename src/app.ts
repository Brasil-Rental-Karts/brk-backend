import express, { Application } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { BaseController } from './controllers/base.controller';
import path from 'path';
import fs from 'fs';
import config from './config/config';
import cookieParser from 'cookie-parser';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BRK Backend API',
      version: '1.0.0',
      description: 'API documentation for BRK Backend',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://brk-backend.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    `${__dirname}/controllers/*.js`,
    `${__dirname}/dtos/*.js`,
    `${__dirname}/models/*.js`,
    `${__dirname}/controllers/*.ts`,
    `${__dirname}/dtos/*.ts`,
    `${__dirname}/models/*.ts`
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export class App {
  public app: Application;

  constructor(controllers: BaseController[]) {
    this.app = express();

    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for Swagger UI
    }));
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Swagger UI, etc.)
        if (!origin) return callback(null, true);
        
        // Always allow localhost with the same port for Swagger UI
        const allowedOrigins = [
          ...config.frontendUrls,
          `http://localhost:${config.port}`,
          `https://localhost:${config.port}`,
          'http://localhost:3000',
          'https://localhost:3000'
        ];
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // In development, be more permissive
        if (config.nodeEnv === 'development') {
          // Allow any localhost origin in development
          if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
            return callback(null, true);
          }
        }
        
        console.log(`CORS blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(morgan('dev'));
    this.app.use(loggerMiddleware);
  }

  private initializeSwagger(): void {
    // Log detected files for debugging
    console.log('Looking for Swagger API docs in:');
    const apiPatterns = swaggerOptions.apis || [];
    apiPatterns.forEach(pattern => {
      console.log(` - ${pattern}`);
    });
    
    // Só expõe Swagger se não for produção
    if (process.env.NODE_ENV !== 'production') {
      // Serve Swagger UI com opções customizadas
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'BRK API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          docExpansion: 'list',
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
          defaultModelsExpandDepth: 3,
          defaultModelExpandDepth: 3,
          displayRequestDuration: true,
          tryItOutEnabled: true
        }
      }));

      // Serve raw Swagger JSON
      this.app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });

      // Log Swagger initialization
      console.log('Swagger documentation initialized');
      // Cast swaggerSpec to any to avoid TypeScript errors with dynamic properties
      const spec = swaggerSpec as any;
      console.log(`Found ${Object.keys(spec.paths || {}).length} API paths`);
      console.log(`Found ${Object.keys(spec.components?.schemas || {}).length} schemas`);
    }
  }

  private initializeControllers(controllers: BaseController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`App listening on port ${port}`);
      console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
    });
  }
}