import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { BaseController } from './controllers/base.controller';

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
  apis: ['./src/controllers/*.ts', './src/dtos/*.ts', './src/models/*.ts']
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
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());
    
    // Configuração normal para todas as rotas
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
      })
    );
    
    this.app.use(morgan('dev'));
    this.app.use(loggerMiddleware);
  }

  private initializeSwagger(): void {
    // Serve Swagger UI with custom options
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
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  private initializeControllers(controllers: BaseController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`App listening on port ${port}`);
      console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
    });
  }
}