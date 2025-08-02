import axios, { AxiosInstance } from 'axios';
import config from '../config/config';

export interface ShortioResponse {
  shortURL: string;
  originalURL: string;
  title?: string;
  tags?: string[];
}

export class ShortioService {
  private apiClient: AxiosInstance;

  constructor() {
    const apiKey = config.shortio.apiKey;
    const domain = config.shortio.domain;

    if (!apiKey) {
      throw new Error('SHORTIO_API_KEY environment variable is required. Please check your .env file.');
    }

    if (!domain) {
      throw new Error('SHORTIO_DOMAIN environment variable is required. Please check your .env file.');
    }

    this.apiClient = axios.create({
      baseURL: 'https://api.short.io',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'BRK-Backend/1.0.0',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Encurta uma URL usando o short.io
   */
  async shortenUrl(originalUrl: string, title?: string, tags?: string[]): Promise<ShortioResponse> {
    try {
      const response = await this.apiClient.post('/links', {
        originalURL: originalUrl,
        domain: config.shortio.domain,
        title: title || 'BRK Confirmação',
        tags: tags || ['brk', 'confirmation'],
        // Habilita detecção de duplicatas - se já existe um link para esta URL, retorna o existente
        allowDuplicates: false,
      });

      return {
        shortURL: response.data.shortURL,
        originalURL: response.data.originalURL,
        title: response.data.title,
        tags: response.data.tags,
      };
    } catch (error: any) {
      if (error.response?.data?.message === 'Domain not found') {
        throw new Error(`Domain '${config.shortio.domain}' not found in short.io account. Please verify the domain is configured correctly.`);
      }
      
      throw new Error(`Failed to shorten URL: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Encurta múltiplas URLs
   */
  async shortenMultipleUrls(urls: Array<{ url: string; title?: string; tags?: string[] }>): Promise<ShortioResponse[]> {
    try {
      const promises = urls.map(({ url, title, tags }) => 
        this.shortenUrl(url, title, tags)
      );
      
      return await Promise.all(promises);
    } catch (error: any) {
      throw new Error(`Failed to shorten URLs: ${error.message}`);
    }
  }

  /**
   * Busca um link existente por URL original
   */
  async findExistingLink(originalUrl: string): Promise<ShortioResponse | null> {
    try {
      const response = await this.apiClient.get('/links', {
        params: {
          domain: config.shortio.domain,
          limit: 100, // Busca até 100 links
        }
      });

      // Procura por um link que tenha a mesma URL original
      const existingLink = response.data.links?.find((link: any) => 
        link.originalURL === originalUrl
      );

      if (existingLink) {
        return {
          shortURL: existingLink.shortURL,
          originalURL: existingLink.originalURL,
          title: existingLink.title,
          tags: existingLink.tags,
        };
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Encurta uma URL com verificação de duplicatas
   */
  async shortenUrlWithDuplicateCheck(originalUrl: string, title?: string, tags?: string[]): Promise<ShortioResponse> {
    try {
      // Primeiro, tenta encontrar um link existente
      const existingLink = await this.findExistingLink(originalUrl);
      
      if (existingLink) {
        return existingLink;
      }

      // Se não encontrou, cria um novo
      return await this.shortenUrl(originalUrl, title, tags);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Testa a conectividade com a API do short.io
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/domains');
      return response.status === 200;
    } catch (error: any) {
      return false;
    }
  }
}

// Export singleton instance
export const shortioService = new ShortioService(); 