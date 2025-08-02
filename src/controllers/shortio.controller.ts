import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { shortioService } from '../services/shortio.service';

export class ShortioController extends BaseController {
  constructor() {
    super('/shortio');
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.post('/shorten', this.shortenUrl.bind(this));
    this.router.post('/shorten-multiple', this.shortenMultipleUrls.bind(this));
    this.router.get('/find', this.findExistingLink.bind(this));
    this.router.get('/test', this.testConnection.bind(this));
  }

  /**
   * Encurta uma única URL
   */
  private async shortenUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url, title, tags, checkDuplicates = true } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      let result;
      if (checkDuplicates) {
        // Usa o método com verificação de duplicatas
        result = await shortioService.shortenUrlWithDuplicateCheck(url, title, tags);
      } else {
        // Usa o método original sem verificação
        result = await shortioService.shortenUrl(url, title, tags);
      }
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in shortenUrl controller:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Encurta múltiplas URLs
   */
  private async shortenMultipleUrls(req: Request, res: Response): Promise<void> {
    try {
      const { urls } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'URLs array is required and must not be empty' });
        return;
      }

      const results = await shortioService.shortenMultipleUrls(urls);
      
      res.status(200).json(results);
    } catch (error: any) {
      console.error('Error in shortenMultipleUrls controller:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca um link existente por URL original
   */
  private async findExistingLink(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL query parameter is required' });
        return;
      }

      const result = await shortioService.findExistingLink(url);
      
      if (result) {
        res.status(200).json(result);
      } else {
        res.status(404).json({ message: 'No existing link found for this URL' });
      }
    } catch (error: any) {
      console.error('Error in findExistingLink controller:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Testa a conectividade com o short.io
   */
  private async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await shortioService.testConnection();
      
      if (isConnected) {
        res.status(200).json({ connected: true, message: 'Short.io connection successful' });
      } else {
        res.status(503).json({ connected: false, message: 'Short.io connection failed' });
      }
    } catch (error: any) {
      console.error('Error in testConnection controller:', error);
      res.status(500).json({ error: error.message });
    }
  }
} 