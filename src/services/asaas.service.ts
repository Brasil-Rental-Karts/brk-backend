import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { removeDocumentMask, isValidDocumentLength } from '../utils/document.util';

export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  observations?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  groupName?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: 'CREDIT_CARD' | 'PIX';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
    type: 'PERCENTAGE';
  };
  fine?: {
    value: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
    totalFixedValue?: number;
    description?: string;
  }>;
  callback?: {
    successUrl?: string;
    autoRedirect?: boolean;
  };
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  };
  remoteIp?: string;
}

export interface AsaasInstallment extends Omit<AsaasPayment, 'billingType' | 'value' | 'installmentCount' | 'installmentValue'> {
  billingType: 'PIX'; // Parcelamento só para PIX
  installmentCount: number;
  totalValue: number;
}

export interface AsaasPaymentResponse {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink: string | null;
  dueDate: string;
  value: number;
  netValue: number;
  billingType: string;
  canBePaidAfterDueDate: boolean;
  pixTransaction: any;
  status: string;
  description: string;
  externalReference: string;
  originalDueDate: string;
  paymentDate: string | null;
  clientPaymentDate: string | null;
  installmentNumber: number | null;
  installment?: string;
  invoiceUrl: string;
  bankSlipUrl: string | null;
  transactionReceiptUrl: string | null;
  invoiceNumber: string;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  lastInvoiceViewedDate: string | null;
  lastBankSlipViewedDate: string | null;
  postalService: boolean;
  custody: string | null;
  refunds: any[];
  qrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
}

export interface AsaasInstallmentResponse {
  object: string;
  id: string;
  value: number;
  netValue: number;
  paymentValue: number;
  installmentCount: number;
  billingType: string;
  paymentDate: string | null;
  description: string;
  expirationDay: number;
  deleted: boolean;
  dateCreated: string;
  checkoutSession: any;
  customer: string;
  paymentLink: string | null;
  transactionReceiptUrl: string | null;
  creditCard: any;
  refunds: any;
  externalReference?: string;
}

export class AsaasService {
  private apiClient: AxiosInstance;

  constructor() {
    let baseURL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    const apiKey = process.env.ASAAS_API_KEY;

    // Verificar se a URL está correta
    if (baseURL === 'https://asaas.com/api/v3') {
      console.warn('[ASAAS] URL de produção detectada, mas pode estar incorreta. Verificando...');
      // A URL correta para produção deve ser https://www.asaas.com/api/v3
      baseURL = 'https://www.asaas.com/api/v3';
    }
    
    // Verificar se estamos usando a URL correta para produção
    if (process.env.NODE_ENV === 'production') {
      if (baseURL.includes('sandbox')) {
        console.warn('[ASAAS] ATENÇÃO: Usando URL de sandbox em produção!');
      } else if (!baseURL.includes('www.asaas.com')) {
        console.warn('[ASAAS] ATENÇÃO: URL de produção pode estar incorreta:', baseURL);
      }
    }

    console.log('[ASAAS] Inicializando serviço com configuração:', {
      baseURL,
      originalUrl: process.env.ASAAS_API_URL,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      asaasApiUrl: process.env.ASAAS_API_URL,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      apiKeySuffix: apiKey?.substring(apiKey.length - 4)
    });

    if (!apiKey) {
      throw new Error('ASAAS_API_KEY is required');
    }

    this.apiClient = axios.create({
      baseURL,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'BRK-Backend/1.0.0',
      },
      timeout: process.env.NODE_ENV === 'production' ? 60000 : 30000, // 60s para produção, 30s para desenvolvimento
    });

    console.log('[ASAAS] Headers configurados:', {
      access_token: apiKey ? '***' : 'undefined',
      contentType: 'application/json',
      userAgent: 'BRK-Backend/1.0.0'
    });

    // Interceptor para logs de requisições
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log('[ASAAS] Requisição:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          headers: config.headers,
          data: config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : undefined
        });
        return config;
      },
      (error) => {
        console.error('[ASAAS] Erro na requisição:', error.message);
        return Promise.reject(error);
      }
    );

    // Interceptor para logs de respostas
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log('[ASAAS] Resposta:', {
          status: response.status,
          url: response.config.url,
          dataKeys: Object.keys(response.data || {})
        });
        return response;
      },
      (error) => {
        console.error('[ASAAS] Erro na resposta:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Testa a conectividade com a API do Asaas
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[ASAAS] Testando conectividade com a API...');
      const response = await this.apiClient.get('/customers?limit=1');
      console.log('[ASAAS] Conectividade OK:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {})
      });
      return true;
    } catch (error: any) {
      console.error('[ASAAS] Erro na conectividade:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  /**
   * Cria ou atualiza um cliente no Asaas
   */
  async createOrUpdateCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ASAAS] Tentativa ${attempt}/${maxRetries} de createOrUpdateCustomer`);
        
        return await this._createOrUpdateCustomer(customerData);
      } catch (error: any) {
        lastError = error;
        console.error(`[ASAAS] Erro na tentativa ${attempt}/${maxRetries}:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`[ASAAS] Aguardando 2 segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Método interno para criar ou atualizar cliente
   */
  private async _createOrUpdateCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    try {
      console.log('[ASAAS] Iniciando createOrUpdateCustomer com dados:', {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: customerData.cpfCnpj ? '***' : 'undefined'
      });

      // Testar conectividade primeiro
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new BadRequestException('Não foi possível conectar com a API do Asaas');
      }

      // Remove máscara do CPF/CNPJ antes de enviar
      const cleanCustomerData = {
        ...customerData,
        cpfCnpj: removeDocumentMask(customerData.cpfCnpj)
      };
      
      console.log('[ASAAS] CPF/CNPJ limpo:', cleanCustomerData.cpfCnpj ? '***' : 'undefined');
      
      // Validar se o CPF/CNPJ tem tamanho correto
      if (!cleanCustomerData.cpfCnpj || !isValidDocumentLength(cleanCustomerData.cpfCnpj)) {
        console.error('[ASAAS] CPF/CNPJ inválido:', {
          original: customerData.cpfCnpj,
          cleaned: cleanCustomerData.cpfCnpj,
          length: cleanCustomerData.cpfCnpj?.length
        });
        throw new BadRequestException('CPF/CNPJ inválido. Deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).');
      }
      
      // Primeiro, tenta buscar o cliente por CPF/CNPJ
      const existingCustomer = await this.findCustomerByCpfCnpj(cleanCustomerData.cpfCnpj);
      
      if (existingCustomer) {
        console.log('[ASAAS] Cliente existente encontrado, ID:', existingCustomer.id);
        // Se encontrou, atualiza o cliente
        const response: AxiosResponse<any> = await this.apiClient.put(
          `/customers/${existingCustomer.id}`,
          cleanCustomerData
        );
        console.log('[ASAAS] Cliente atualizado, resposta:', {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email
        });
        
        // Verificar se a resposta veio como lista em vez de objeto
        let customerData = response.data;
        if (Array.isArray(response.data)) {
          console.warn('[ASAAS] Resposta veio como array, usando primeiro item');
          customerData = response.data[0];
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.warn('[ASAAS] Resposta veio com estrutura de lista, usando primeiro item');
          customerData = response.data.data[0];
        }
        
        // Verificar se a resposta tem a estrutura esperada
        if (response.data && response.data.object === 'list' && response.data.totalCount === 0) {
          console.error('[ASAAS] Resposta indica lista vazia, mas deveria ser criação de cliente');
          console.error('[ASAAS] Isso pode indicar problema com a URL da API ou autenticação');
          throw new BadRequestException('API retornou lista vazia em vez de criar cliente. Verifique URL e autenticação.');
        }
        
        console.log('[ASAAS] Cliente atualizado, dados finais:', {
          id: customerData?.id,
          name: customerData?.name,
          email: customerData?.email
        });
        
        // Verificar se o ID foi retornado corretamente
        if (!customerData?.id) {
          console.error('[ASAAS] Cliente atualizado mas sem ID:', customerData);
          throw new BadRequestException('Cliente atualizado no Asaas mas ID não foi retornado');
        }
        
        return customerData;
      } else {
        console.log('[ASAAS] Cliente não encontrado, criando novo cliente');
        // Se não encontrou, cria um novo cliente
        console.log('[ASAAS] Dados para criação:', {
          name: cleanCustomerData.name,
          email: cleanCustomerData.email,
          cpfCnpj: cleanCustomerData.cpfCnpj ? '***' : 'undefined',
          notificationDisabled: cleanCustomerData.notificationDisabled
        });
        
        console.log('[ASAAS] Payload completo para criação:', JSON.stringify(cleanCustomerData, null, 2));
        console.log('[ASAAS] Endpoint para criação:', '/customers');
        console.log('[ASAAS] Método HTTP:', 'POST');
        
        const response: AxiosResponse<any> = await this.apiClient.post(
          '/customers',
          cleanCustomerData
        );
        
        console.log('[ASAAS] Resposta completa da criação:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          keys: Object.keys(response.data || {})
        });
        
        // Verificar se o status indica sucesso
        if (response.status !== 200 && response.status !== 201) {
          console.error('[ASAAS] Status de resposta inesperado:', response.status);
          throw new BadRequestException(`Status de resposta inesperado: ${response.status}`);
        }
        
        // Verificar se a resposta veio como lista em vez de objeto
        let customerData = response.data;
        if (Array.isArray(response.data)) {
          console.warn('[ASAAS] Resposta veio como array, usando primeiro item');
          customerData = response.data[0];
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.warn('[ASAAS] Resposta veio com estrutura de lista, usando primeiro item');
          customerData = response.data.data[0];
        }
        
        // Verificar se a resposta tem a estrutura esperada
        if (response.data && response.data.object === 'list' && response.data.totalCount === 0) {
          console.error('[ASAAS] Resposta indica lista vazia, mas deveria ser criação de cliente');
          console.error('[ASAAS] Isso pode indicar problema com a URL da API ou autenticação');
          throw new BadRequestException('API retornou lista vazia em vez de criar cliente. Verifique URL e autenticação.');
        }
        
        console.log('[ASAAS] Cliente criado, resposta:', {
          id: customerData?.id,
          name: customerData?.name,
          email: customerData?.email,
          fullResponse: customerData
        });
        
        // Verificar se o ID foi retornado corretamente
        if (!customerData?.id) {
          console.error('[ASAAS] Cliente criado mas sem ID:', customerData);
          throw new BadRequestException('Cliente criado no Asaas mas ID não foi retornado');
        }
        
        return customerData;
      }
    } catch (error: any) {
      console.error('[ASAAS] Erro em createOrUpdateCustomer:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Busca um cliente por CPF/CNPJ
   */
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    try {
      console.log('[ASAAS] Buscando cliente por CPF/CNPJ:', cpfCnpj ? '***' : 'undefined');
      
      // Remove máscara do CPF/CNPJ antes de buscar
      const cleanCpfCnpj = removeDocumentMask(cpfCnpj);
      console.log('[ASAAS] CPF/CNPJ limpo para busca:', cleanCpfCnpj ? '***' : 'undefined');
      
      const response: AxiosResponse<{ data: AsaasCustomer[] }> = await this.apiClient.get(
        `/customers?cpfCnpj=${cleanCpfCnpj}`
      );
      
      console.log('[ASAAS] Resposta da busca:', {
        totalResults: response.data.data?.length || 0,
        foundCustomer: response.data.data?.length > 0 ? {
          id: response.data.data[0].id,
          name: response.data.data[0].name,
          email: response.data.data[0].email
        } : null
      });
      
      return response.data.data.length > 0 ? response.data.data[0] : null;
    } catch (error: any) {
      console.error('[ASAAS] Erro ao buscar cliente por CPF/CNPJ:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return null;
    }
  }

  /**
   * Cria uma cobrança no Asaas
   */
  async createPayment(paymentData: AsaasPayment): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> = await this.apiClient.post(
        '/payments',
        paymentData
      );
      
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas.'
      );
    }
  }

  /**
   * Recupera informações de uma cobrança
   */
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> = await this.apiClient.get(
        `/payments/${paymentId}`
      );
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Cancela uma cobrança
   */
  async cancelPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> = await this.apiClient.delete(
        `/payments/${paymentId}`
      );
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Gera QR Code PIX para uma cobrança
   */
  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    try {
      const response: AxiosResponse<{ encodedImage: string; payload: string; expirationDate: string }> = 
        await this.apiClient.get(`/payments/${paymentId}/pixQrCode`);
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Mapeia os métodos de pagamento do sistema interno para os aceitos pela Asaas
   */
  mapPaymentMethodToAsaas(paymentMethod: string): 'CREDIT_CARD' | 'PIX' {
    const mapping: Record<string, 'CREDIT_CARD' | 'PIX'> = {
      'cartao_credito': 'CREDIT_CARD',
      'pix': 'PIX'
    };

    return mapping[paymentMethod] || 'PIX';
  }

  /**
   * Formata a data para o formato aceito pela Asaas (YYYY-MM-DD)
   */
  formatDateForAsaas(date: Date | string): string {
    try {
      // Se já é uma string no formato YYYY-MM-DD, retorna como está
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // Se é uma string, tenta converter para Date
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Verifica se é uma data válida
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        throw new Error('Data inválida');
      }
      
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      // Fallback: retorna data atual
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Valida se o webhook recebido é autêntico (implementação básica)
   */
  validateWebhook(payload: any, signature?: string): boolean {
    // Implementar validação de webhook conforme documentação da Asaas
    // Por enquanto, retorna true para permitir o desenvolvimento
    return true;
  }

  /**
   * Cria um parcelamento no Asaas
   * Para PIX parcelado, usa o endpoint /installments que cria um parcelamento
   * onde todas as parcelas são PIX
   */
  async createInstallmentPlan(paymentData: AsaasInstallment): Promise<AsaasInstallmentResponse> {
    try {
      const response: AxiosResponse<AsaasInstallmentResponse> = await this.apiClient.post(
        '/installments',
        paymentData
      );
      
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || 'Erro ao criar parcelamento no Asaas.'
      );
    }
  }

  /**
   * Busca todas as parcelas de um plano de parcelamento (installment plan)
   * Este é o endpoint correto conforme documentação do Asaas:
   * GET /installments/{installment_id}/payments
   */
  async getInstallmentPayments(installmentId: string): Promise<AsaasPaymentResponse[]> {
    try {
      const response: AxiosResponse<{
        object: string;
        hasMore: boolean;
        totalCount: number;
        limit: number;
        offset: number;
        data: AsaasPaymentResponse[];
      }> = await this.apiClient.get(`/installments/${installmentId}/payments`);
      
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Erro ao buscar parcelas do plano de parcelamento: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  /**
   * Busca informações de um plano de parcelamento
   */
  async getInstallmentPlan(installmentId: string): Promise<AsaasInstallmentResponse> {
    try {
      const response: AxiosResponse<AsaasInstallmentResponse> = await this.apiClient.get(
        `/installments/${installmentId}`
      );
      
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || 'Erro ao buscar plano de parcelamento.'
      );
    }
  }
} 