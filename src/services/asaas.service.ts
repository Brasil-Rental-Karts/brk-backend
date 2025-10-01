import axios, { AxiosInstance, AxiosResponse } from 'axios';

import { BadRequestException } from '../exceptions/bad-request.exception';
import {
  isValidDocumentLength,
  removeDocumentMask,
} from '../utils/document.util';

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

export interface AsaasInstallment
  extends Omit<
    AsaasPayment,
    'billingType' | 'value' | 'installmentCount' | 'installmentValue'
  > {
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
    let baseURL =
      process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    const apiKey = process.env.ASAAS_API_KEY;

    // Verificar se a URL está correta
    if (baseURL === 'https://asaas.com/api/v3') {
      baseURL = 'https://www.asaas.com/api/v3';
    }

    if (!apiKey) {
      throw new Error('ASAAS_API_KEY is required');
    }

    this.apiClient = axios.create({
      baseURL,
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'BRK-Backend/1.0.0',
      },
      timeout: process.env.NODE_ENV === 'production' ? 120000 : 60000, // Aumentado para 60s em dev e 120s em prod
    });
  }

  /**
   * Testa a conectividade com a API do Asaas
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/customers?limit=1');
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Cria ou atualiza um cliente no Asaas
   */
  async createOrUpdateCustomer(
    customerData: AsaasCustomer
  ): Promise<AsaasCustomer> {
    const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this._createOrUpdateCustomer(customerData);
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Método interno para criar ou atualizar cliente
   */
  private async _createOrUpdateCustomer(
    customerData: AsaasCustomer
  ): Promise<AsaasCustomer> {
    try {
      // Testar conectividade primeiro
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new BadRequestException(
          'Não foi possível conectar com a API do Asaas'
        );
      }

      // Remove máscara do CPF/CNPJ antes de enviar
      const cleanCustomerData = {
        ...customerData,
        cpfCnpj: removeDocumentMask(customerData.cpfCnpj),
      };

      // Validar se o CPF/CNPJ tem tamanho correto
      if (
        !cleanCustomerData.cpfCnpj ||
        !isValidDocumentLength(cleanCustomerData.cpfCnpj)
      ) {
        throw new BadRequestException(
          'CPF/CNPJ inválido. Deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).'
        );
      }

      // Primeiro, tenta buscar o cliente por CPF/CNPJ
      const existingCustomer = await this.findCustomerByCpfCnpj(
        cleanCustomerData.cpfCnpj
      );

      if (existingCustomer) {
        // Se encontrou, atualiza o cliente
        const response: AxiosResponse<any> = await this.apiClient.put(
          `/customers/${existingCustomer.id}`,
          cleanCustomerData
        );

        // Verificar se a resposta veio como lista em vez de objeto
        let customerData = response.data;
        if (Array.isArray(response.data)) {
          customerData = response.data[0];
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          customerData = response.data.data[0];
        }

        // Verificar se a resposta tem a estrutura esperada
        if (
          response.data &&
          response.data.object === 'list' &&
          response.data.totalCount === 0
        ) {
          throw new BadRequestException(
            'API retornou lista vazia em vez de criar cliente. Verifique URL e autenticação.'
          );
        }

        return customerData;
      } else {
        // Se não encontrou, cria um novo cliente
        const response: AxiosResponse<any> = await this.apiClient.post(
          '/customers',
          cleanCustomerData
        );

        // Verificar se o status indica sucesso
        if (response.status !== 200 && response.status !== 201) {
          throw new BadRequestException(
            `Status de resposta inesperado: ${response.status}`
          );
        }

        // Verificar se a resposta veio como lista em vez de objeto
        let customerData = response.data;
        if (Array.isArray(response.data)) {
          customerData = response.data[0];
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          customerData = response.data.data[0];
        }

        // Verificar se a resposta tem a estrutura esperada
        if (
          response.data &&
          response.data.object === 'list' &&
          response.data.totalCount === 0
        ) {
          throw new BadRequestException(
            'API retornou lista vazia em vez de criar cliente. Verifique URL e autenticação.'
          );
        }

        return customerData;
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

      const response: AxiosResponse<{ data: AsaasCustomer[] }> =
        await this.apiClient.get(`/customers?cpfCnpj=${cleanCpfCnpj}`);

      return response.data.data.length > 0 ? response.data.data[0] : null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Cria uma cobrança no Asaas
   */
  async createPayment(
    paymentData: AsaasPayment
  ): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> =
        await this.apiClient.post('/payments', paymentData);

      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao criar cobrança no Asaas.'
      );
    }
  }

  /**
   * Recupera informações de uma cobrança
   */
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> =
        await this.apiClient.get(`/payments/${paymentId}`);
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
      const response: AxiosResponse<AsaasPaymentResponse> =
        await this.apiClient.delete(`/payments/${paymentId}`);
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
  async getPixQrCode(paymentId: string): Promise<{
    encodedImage: string;
    payload: string;
    expirationDate: string;
  }> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response: AxiosResponse<{
          encodedImage: string;
          payload: string;
          expirationDate: string;
        }> = await this.apiClient.get(`/payments/${paymentId}/pixQrCode`);

        return response.data;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[ASAAS] Erro na tentativa ${attempt} ao buscar QR Code PIX:`,
          {
            paymentId,
            error: error.message,
            response: error.response?.data,
          }
        );

        if (attempt < maxRetries) {
          // Aguardar antes da próxima tentativa (backoff exponencial)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      '[ASAAS] Todas as tentativas falharam ao buscar QR Code PIX:',
      {
        paymentId,
        finalError: lastError.message,
      }
    );

    throw new BadRequestException(
      lastError.response?.data?.errors?.[0]?.description ||
        `Erro ao gerar QR Code PIX após ${maxRetries} tentativas: ${lastError.message}`
    );
  }

  /**
   * Atualiza a data de vencimento de uma cobrança
   */
  async updatePaymentDueDate(
    paymentId: string,
    newDueDate: string
  ): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> =
        await this.apiClient.put(`/payments/${paymentId}`, {
          dueDate: newDueDate,
        });

      return response.data;
    } catch (error: any) {
      console.error(
        '[ASAAS DEBUG] Erro detalhado ao atualizar data de vencimento:',
        {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
        }
      );

      // Se for erro 400, tentar obter mais detalhes
      if (error.response?.status === 400) {
        const errorDetails = error.response?.data;
        if (errorDetails?.errors && Array.isArray(errorDetails.errors)) {
          const errorMessage = errorDetails.errors
            .map((err: any) => `${err.code}: ${err.description}`)
            .join(', ');
          throw new BadRequestException(`Erro 400 do Asaas: ${errorMessage}`);
        } else if (errorDetails?.message) {
          throw new BadRequestException(
            `Erro 400 do Asaas: ${errorDetails.message}`
          );
        } else {
          throw new BadRequestException(
            `Erro 400 do Asaas: ${JSON.stringify(errorDetails)}`
          );
        }
      }

      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao atualizar data de vencimento no Asaas.'
      );
    }
  }

  /**
   * Atualiza o valor de uma cobrança
   */
  async updatePaymentValue(
    paymentId: string,
    newValue: number
  ): Promise<AsaasPaymentResponse> {
    try {
      const response: AxiosResponse<AsaasPaymentResponse> =
        await this.apiClient.put(`/payments/${paymentId}`, {
          value: Number(newValue),
        });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new BadRequestException(
          'Cobrança não encontrada no Asaas (404). Verifique se o ID existe e se a chave/API URL correspondem ao mesmo ambiente.'
        );
      }
      console.error(
        '[ASAAS DEBUG] Erro detalhado ao atualizar valor da cobrança:',
        {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
        }
      );

      if (error.response?.status === 400) {
        const errorDetails = error.response?.data;
        if (errorDetails?.errors && Array.isArray(errorDetails.errors)) {
          const errorMessage = errorDetails.errors
            .map((err: any) => `${err.code}: ${err.description}`)
            .join(', ');
          throw new BadRequestException(`Erro 400 do Asaas: ${errorMessage}`);
        } else if (errorDetails?.message) {
          throw new BadRequestException(
            `Erro 400 do Asaas: ${errorDetails.message}`
          );
        } else {
          throw new BadRequestException(
            `Erro 400 do Asaas: ${JSON.stringify(errorDetails)}`
          );
        }
      }

      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao atualizar valor da cobrança no Asaas.'
      );
    }
  }

  /**
   * Reativa uma fatura vencida atualizando a data de vencimento e gerando novo QR Code PIX
   */
  async reactivateOverduePayment(
    paymentId: string,
    newDueDate: string
  ): Promise<{
    payment: AsaasPaymentResponse;
    qrCode: { encodedImage: string; payload: string; expirationDate: string };
  }> {
    try {
      // 1. Atualizar a data de vencimento

      const updatedPayment = await this.updatePaymentDueDate(
        paymentId,
        newDueDate
      );

      // 2. Gerar novo QR Code PIX

      const qrCode = await this.getPixQrCode(paymentId);

      return {
        payment: updatedPayment,
        qrCode,
      };
    } catch (error: any) {
      console.error('[ASAAS DEBUG] Erro durante reativação:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao reativar fatura vencida.'
      );
    }
  }

  /**
   * Mapeia os métodos de pagamento do sistema interno para os aceitos pela Asaas
   */
  mapPaymentMethodToAsaas(paymentMethod: string): 'CREDIT_CARD' | 'PIX' {
    const mapping: Record<string, 'CREDIT_CARD' | 'PIX'> = {
      cartao_credito: 'CREDIT_CARD',
      pix: 'PIX',
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

      // Monta YYYY-MM-DD a partir dos componentes locais para evitar deslocamento UTC
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      // Fallback: retorna data atual
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
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
  async createInstallmentPlan(
    paymentData: AsaasInstallment
  ): Promise<AsaasInstallmentResponse> {
    try {
      const response: AxiosResponse<AsaasInstallmentResponse> =
        await this.apiClient.post('/installments', paymentData);

      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao criar parcelamento no Asaas.'
      );
    }
  }

  /**
   * Busca todas as parcelas de um plano de parcelamento (installment plan)
   * Este é o endpoint correto conforme documentação do Asaas:
   * GET /installments/{installment_id}/payments
   */
  async getInstallmentPayments(
    installmentId: string
  ): Promise<AsaasPaymentResponse[]> {
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
      throw new Error(
        `Erro ao buscar parcelas do plano de parcelamento: ${error.response?.data?.errors?.[0]?.description || error.message}`
      );
    }
  }

  /**
   * Busca informações de um plano de parcelamento
   */
  async getInstallmentPlan(
    installmentId: string
  ): Promise<AsaasInstallmentResponse> {
    try {
      const response: AxiosResponse<AsaasInstallmentResponse> =
        await this.apiClient.get(`/installments/${installmentId}`);

      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description ||
          'Erro ao buscar plano de parcelamento.'
      );
    }
  }
}
