import express, { Application } from 'express';
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
    console.log(`🏗️ [APP] Inicializando aplicação BRK Backend...`);
    this.app = express();

    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeControllers(controllers);
    this.initializeErrorHandling();
    console.log(`✅ [APP] Aplicação inicializada com sucesso`);
  }

  private initializeMiddlewares(): void {
    console.log(`🔧 [MIDDLEWARE] Inicializando middlewares...`);
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
        
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(morgan('dev'));
    this.app.use(loggerMiddleware);
    console.log(`✅ [MIDDLEWARE] Middlewares configurados com sucesso`);
  }

  private initializeSwagger(): void {
    console.log(`📚 [SWAGGER] Configurando documentação da API...`);
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
      console.log(`✅ [SWAGGER] Documentação configurada para ambiente de desenvolvimento`);
    } else {
      console.log(`⚠️ [SWAGGER] Documentação desabilitada em produção`);
    }
  }

  private initializeControllers(controllers: BaseController[]): void {
    console.log(`🎮 [CONTROLLERS] Registrando ${controllers.length} controllers...`);
    controllers.forEach((controller) => {
      console.log(`  📍 [CONTROLLER] ${controller.constructor.name} -> ${controller.path}`);
      this.app.use(controller.path, controller.router);
    });
    console.log(`✅ [CONTROLLERS] Todos os controllers registrados com sucesso`);
  }

  private initializeErrorHandling(): void {
    console.log(`🛡️ [ERROR] Configurando middleware de tratamento de erros...`);
    this.app.use(errorMiddleware);
    console.log(`✅ [ERROR] Middleware de erro configurado`);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`🚀 [SERVER] Servidor iniciado na porta ${port}`);
      console.log(`📊 [SERVER] Ambiente: ${config.nodeEnv}`);
      console.log(`🌐 [SERVER] URLs permitidas: ${config.frontendUrls.join(', ')}`);
      console.log(`📚 [SERVER] Documentação disponível em: http://localhost:${port}/api-docs`);
      console.log(`⏰ [SERVER] Data/Hora de inicialização: ${new Date().toISOString()}`);
    });
  }
}