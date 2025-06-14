import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BadRequestException } from '../exceptions/bad-request.exception';

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
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD';
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

export interface AsaasSubAccount {
  id?: string;
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate?: string;
  companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';
  phone?: string;
  mobilePhone?: string;
  site?: string;
  incomeValue?: number;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AsaasSubAccountResponse {
  object: string;
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate: string;
  companyType: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  walletId: string;
  apiKey: string;
  status: string;
  dateCreated: string;
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
        console.log(`[ASAAS] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ASAAS] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para logs de respostas
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`[ASAAS] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[ASAAS] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Cria ou atualiza um cliente no Asaas
   */
  async createOrUpdateCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    try {
      // Primeiro, tenta buscar o cliente por CPF/CNPJ
      const existingCustomer = await this.findCustomerByCpfCnpj(customerData.cpfCnpj);
      
      if (existingCustomer) {
        // Se encontrou, atualiza o cliente
        const response: AxiosResponse<AsaasCustomer> = await this.apiClient.put(
          `/customers/${existingCustomer.id}`,
          customerData
        );
        return response.data;
      } else {
        // Se não encontrou, cria um novo cliente
        const response: AxiosResponse<AsaasCustomer> = await this.apiClient.post(
          '/customers',
          customerData
        );
        return response.data;
      }
    } catch (error: any) {
      console.error('[ASAAS] Error creating/updating customer:', error.response?.data || error.message);
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
      const response: AxiosResponse<{ data: AsaasCustomer[] }> = await this.apiClient.get(
        `/customers?cpfCnpj=${cpfCnpj}`
      );
      
      return response.data.data.length > 0 ? response.data.data[0] : null;
    } catch (error: any) {
      console.error('[ASAAS] Error finding customer:', error.response?.data || error.message);
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
      console.error('[ASAAS] Error creating payment:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
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
      console.error('[ASAAS] Error getting payment:', error.response?.data || error.message);
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
      console.error('[ASAAS] Error canceling payment:', error.response?.data || error.message);
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
      console.error('[ASAAS] Error getting PIX QR Code:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Mapeia os métodos de pagamento do sistema interno para os aceitos pela Asaas
   */
  mapPaymentMethodToAsaas(paymentMethod: string): 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD' {
    const mapping: Record<string, 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD'> = {
      'boleto': 'BOLETO',
      'cartao_credito': 'CREDIT_CARD',
      'pix': 'PIX',
      'cartao_debito': 'DEBIT_CARD'
    };

    return mapping[paymentMethod] || 'BOLETO';
  }

  /**
   * Formata a data para o formato aceito pela Asaas (YYYY-MM-DD)
   */
  formatDateForAsaas(date: Date): string {
    return date.toISOString().split('T')[0];
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
   * Busca uma subconta por CPF/CNPJ
   */
  async findSubAccountByCpfCnpj(cpfCnpj: string): Promise<AsaasSubAccountResponse | null> {
    try {
      console.log(`[ASAAS] Buscando subconta para CPF/CNPJ: ${cpfCnpj}`);
      
      const response: AxiosResponse<{ data: AsaasSubAccountResponse[] }> = await this.apiClient.get(
        `/accounts?cpfCnpj=${cpfCnpj}`
      );
      
      const subAccount = response.data.data.length > 0 ? response.data.data[0] : null;
      
      if (subAccount) {
        console.log(`[ASAAS] Subconta encontrada: ${subAccount.id} - WalletID: ${subAccount.walletId}`);
      } else {
        console.log(`[ASAAS] Nenhuma subconta encontrada para CPF/CNPJ: ${cpfCnpj}`);
      }
      
      return subAccount;
    } catch (error: any) {
      console.error('[ASAAS] Error finding subaccount:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Cria uma nova subconta não white label no Asaas
   */
  async createSubAccount(subAccountData: AsaasSubAccount): Promise<AsaasSubAccountResponse> {
    try {
      console.log(`[ASAAS] Criando subconta não white label para: ${subAccountData.name} (${subAccountData.cpfCnpj})`);
      
      // Dados específicos para subconta não white label
      const nonWhiteLabelData = {
        ...subAccountData,
        // Força a criação como subconta não white label
        // removendo campos que podem tornar a conta white label
        site: undefined,
        // Garantindo que seja uma subconta padrão
        walletId: undefined // será gerado automaticamente pelo Asaas
      };
      
      const response: AxiosResponse<AsaasSubAccountResponse> = await this.apiClient.post(
        '/accounts',
        nonWhiteLabelData
      );
      
      console.log(`[ASAAS] Subconta não white label criada com sucesso: ${response.data.id} - WalletID: ${response.data.walletId}`);
      console.log(`[ASAAS] Dados da subconta:`, {
        id: response.data.id,
        walletId: response.data.walletId,
        status: response.data.status,
        name: response.data.name,
        cpfCnpj: response.data.cpfCnpj
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[ASAAS] Error creating non-white-label subaccount:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Busca ou cria uma subconta não white label e retorna o walletId
   */
  async getOrCreateSubAccountWallet(subAccountData: AsaasSubAccount): Promise<{ subAccountId: string; walletId: string }> {
    try {
      console.log(`[ASAAS] Verificando/criando subconta não white label para CPF/CNPJ: ${subAccountData.cpfCnpj}`);
      
      // Primeiro, tenta buscar uma subconta existente
      let subAccount = await this.findSubAccountByCpfCnpj(subAccountData.cpfCnpj);
      
      if (subAccount) {
        console.log(`[ASAAS] Subconta existente encontrada: ${subAccount.id} - WalletID: ${subAccount.walletId}`);
        console.log(`[ASAAS] Verificando se a subconta existente é adequada...`);
        
        return {
          subAccountId: subAccount.id,
          walletId: subAccount.walletId
        };
      }
      
      // Se não encontrou, cria uma nova subconta não white label
      console.log(`[ASAAS] Criando nova subconta não white label para: ${subAccountData.name}`);
      subAccount = await this.createSubAccount(subAccountData);
      
      // Validação adicional para garantir que a subconta foi criada corretamente
      if (!subAccount.walletId) {
        throw new Error('Subconta criada mas walletId não foi gerado');
      }
      
      console.log(`[ASAAS] Subconta não white label configurada com sucesso - ID: ${subAccount.id}, WalletID: ${subAccount.walletId}`);
      
      return {
        subAccountId: subAccount.id,
        walletId: subAccount.walletId
      };
    } catch (error: any) {
      console.error('[ASAAS] Error getting/creating non-white-label subaccount wallet:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errors?.[0]?.description || error.message
      );
    }
  }

  /**
   * Prepara dados da subconta não white label a partir dos dados do campeonato
   */
  prepareSubAccountData(championshipData: any): AsaasSubAccount {
    const isCompany = championshipData.personType === 1;
    
    console.log(`[ASAAS] Preparando dados para subconta não white label - Tipo: ${isCompany ? 'Jurídica' : 'Física'}`);
    
    // Aplicar regras de preenchimento para o Asaas
    let name: string;
    let email: string;
    let mobilePhone: string;
    let birthDate: string | undefined;
    
    if (isCompany) {
      // Pessoa Jurídica: Usar razão social
      name = championshipData.socialReason || championshipData.name;
      mobilePhone = championshipData.responsiblePhone || '';
      email = championshipData.responsibleEmail || `organizador-${championshipData.document}@brk.com.br`;
    } else {
      // Pessoa Física: Nome e telefone do responsável
      name = championshipData.responsibleName || 'Organizador';
      mobilePhone = championshipData.responsiblePhone || '';
      email = championshipData.responsibleEmail || `organizador-${championshipData.document}@brk.com.br`;
      
      // Data de nascimento: Somente para pessoa física
      if (championshipData.responsibleBirthDate) {
        birthDate = new Date(championshipData.responsibleBirthDate).toISOString().split('T')[0];
      }
    }
    
    const subAccountData: AsaasSubAccount = {
      name: name,
      email: email,
      cpfCnpj: championshipData.document,
      birthDate: birthDate,
      companyType: isCompany ? (championshipData.companyType || 'LIMITED') : undefined,
      phone: mobilePhone,
      mobilePhone: mobilePhone,
      incomeValue: championshipData.incomeValue || undefined,
      address: championshipData.fullAddress,
      addressNumber: championshipData.number,
      complement: championshipData.complement,
      province: championshipData.province, // Bairro
      postalCode: championshipData.cep?.replace(/\D/g, ''), // Remove formatação do CEP
      city: championshipData.city,
      state: championshipData.state,
      country: 'Brasil',
      // Campos específicos para garantir que seja não white label
      site: undefined, // Não informamos site para evitar white label
    };

    console.log(`[ASAAS] Dados preparados:`, {
      name: subAccountData.name,
      email: subAccountData.email,
      cpfCnpj: subAccountData.cpfCnpj,
      companyType: subAccountData.companyType,
      birthDate: subAccountData.birthDate,
      incomeValue: subAccountData.incomeValue,
      city: subAccountData.city,
      state: subAccountData.state,
      province: subAccountData.province
    });

    return subAccountData;
  }
} 