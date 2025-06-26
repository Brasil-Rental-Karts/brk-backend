import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { removeDocumentMask } from '../utils/document.util';

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
    const baseURL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    const apiKey = process.env.ASAAS_API_KEY;

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
      timeout: 30000,
    });

    // Interceptor para logs de requisições
    this.apiClient.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para logs de respostas
    this.apiClient.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Cria ou atualiza um cliente no Asaas
   */
  async createOrUpdateCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    try {
      // Remove máscara do CPF/CNPJ antes de enviar
      const cleanCustomerData = {
        ...customerData,
        cpfCnpj: removeDocumentMask(customerData.cpfCnpj)
      };
      
      // Primeiro, tenta buscar o cliente por CPF/CNPJ
      const existingCustomer = await this.findCustomerByCpfCnpj(cleanCustomerData.cpfCnpj);
      
      if (existingCustomer) {
        // Se encontrou, atualiza o cliente
        const response: AxiosResponse<AsaasCustomer> = await this.apiClient.put(
          `/customers/${existingCustomer.id}`,
          cleanCustomerData
        );
        return response.data;
      } else {
        // Se não encontrou, cria um novo cliente
        const response: AxiosResponse<AsaasCustomer> = await this.apiClient.post(
          '/customers',
          cleanCustomerData
        );
        return response.data;
      }
    } catch (error: any) {
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
      // Remove máscara do CPF/CNPJ antes de buscar
      const cleanCpfCnpj = removeDocumentMask(cpfCnpj);
      const response: AxiosResponse<{ data: AsaasCustomer[] }> = await this.apiClient.get(
        `/customers?cpfCnpj=${cleanCpfCnpj}`
      );
      
      return response.data.data.length > 0 ? response.data.data[0] : null;
    } catch (error: any) {
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