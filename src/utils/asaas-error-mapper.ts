export interface AsaasErrorMapping {
  message: string;
  userFriendlyMessage: string;
  suggestions?: string[];
}

/**
 * Mapeamento de códigos de erro do Asaas para mensagens amigáveis
 */
export const ASAAS_ERROR_MAPPINGS: Record<string, AsaasErrorMapping> = {
  // Códigos de erro HTTP
  'invalid_token': {
    message: 'Token de API inválido',
    userFriendlyMessage: 'Problema de configuração da conta. Entre em contato com o suporte.',
    suggestions: ['Verificar se a API Key está correta', 'Regenerar token se necessário']
  },
  'invalid_api_key': {
    message: 'Chave de API inválida',
    userFriendlyMessage: 'Problema de configuração da conta. Entre em contato com o suporte.',
    suggestions: ['Verificar se a API Key está correta', 'Verificar se está usando o ambiente correto (sandbox/produção)']
  },
  'unauthorized': {
    message: 'Não autorizado',
    userFriendlyMessage: 'Acesso negado. Verifique suas credenciais.',
    suggestions: ['Verificar API Key', 'Verificar permissões da conta']
  },
  
  // Erros de cliente/cadastro
  'invalid_cpfCnpj': {
    message: 'CPF/CNPJ inválido',
    userFriendlyMessage: 'O CPF ou CNPJ informado não é válido. Verifique se foi digitado corretamente.',
    suggestions: ['Verificar se o CPF/CNPJ está no formato correto', 'Remover pontos e traços']
  },
  'invalid_email': {
    message: 'Email inválido',
    userFriendlyMessage: 'O email informado não é válido. Verifique se foi digitado corretamente.',
    suggestions: ['Verificar formato do email', 'Verificar se não há espaços extras']
  },
  'invalid_phone': {
    message: 'Telefone inválido',
    userFriendlyMessage: 'O telefone informado não é válido. Use o formato (XX) XXXXX-XXXX.',
    suggestions: ['Incluir DDD', 'Verificar quantidade de dígitos', 'Usar formato com parênteses e hífen']
  },
  'invalid_postalCode': {
    message: 'CEP inválido',
    userFriendlyMessage: 'O CEP informado não é válido. Use o formato XXXXX-XXX.',
    suggestions: ['Verificar se o CEP tem 8 dígitos', 'Usar formato com hífen se necessário']
  },
  'required_name': {
    message: 'Nome é obrigatório',
    userFriendlyMessage: 'O nome é obrigatório. Por favor, informe o nome completo.',
    suggestions: ['Preencher o campo nome', 'Verificar se não há apenas espaços']
  },
  'required_cpfCnpj': {
    message: 'CPF/CNPJ é obrigatório',
    userFriendlyMessage: 'O CPF ou CNPJ é obrigatório. Por favor, informe o documento.',
    suggestions: ['Preencher CPF para pessoa física', 'Preencher CNPJ para pessoa jurídica']
  },
  'required_email': {
    message: 'Email é obrigatório',
    userFriendlyMessage: 'O email é obrigatório. Por favor, informe um email válido.',
    suggestions: ['Preencher o campo email', 'Usar formato nome@dominio.com']
  },
  'customer_already_exists': {
    message: 'Cliente já existe',
    userFriendlyMessage: 'Já existe um cliente cadastrado com este CPF/CNPJ.',
    suggestions: ['Verificar se o cliente já foi cadastrado', 'Usar o cliente existente']
  },
  
  // Erros de cobrança/pagamento
  'invalid_value': {
    message: 'Valor inválido',
    userFriendlyMessage: 'O valor da cobrança deve ser maior que zero.',
    suggestions: ['Informar um valor positivo', 'Verificar se o valor não está zerado']
  },
  'invalid_dueDate': {
    message: 'Data de vencimento inválida',
    userFriendlyMessage: 'A data de vencimento não pode ser anterior à data atual.',
    suggestions: ['Escolher uma data futura', 'Verificar formato da data']
  },
  'required_customer': {
    message: 'Cliente é obrigatório',
    userFriendlyMessage: 'É necessário informar o cliente para criar a cobrança.',
    suggestions: ['Cadastrar o cliente primeiro', 'Informar o ID do cliente']
  },
  'required_billingType': {
    message: 'Tipo de cobrança é obrigatório',
    userFriendlyMessage: 'É necessário escolher a forma de pagamento (boleto, Pix, cartão).',
    suggestions: ['Selecionar uma forma de pagamento', 'Verificar tipos aceitos']
  },
  'invalid_billingType': {
    message: 'Tipo de cobrança inválido',
    userFriendlyMessage: 'A forma de pagamento selecionada não está disponível.',
    suggestions: ['Verificar formas de pagamento aceitas', 'Completar dados comerciais da conta']
  },
  'payment_not_found': {
    message: 'Pagamento não encontrado',
    userFriendlyMessage: 'A cobrança solicitada não foi encontrada.',
    suggestions: ['Verificar se o ID da cobrança está correto', 'Verificar se a cobrança existe']
  },
  
  // Erros de cartão de crédito
  'invalid_creditCard': {
    message: 'Dados do cartão inválidos',
    userFriendlyMessage: 'Os dados do cartão de crédito estão incorretos. Verifique número, validade e CVV.',
    suggestions: ['Verificar número do cartão', 'Verificar data de validade', 'Verificar código de segurança']
  },
  'expired_creditCard': {
    message: 'Cartão expirado',
    userFriendlyMessage: 'O cartão de crédito informado está vencido.',
    suggestions: ['Usar um cartão válido', 'Verificar data de validade']
  },
  'insufficient_funds': {
    message: 'Saldo insuficiente',
    userFriendlyMessage: 'O cartão não possui limite suficiente para esta transação.',
    suggestions: ['Verificar limite do cartão', 'Usar outro cartão', 'Escolher outra forma de pagamento']
  },
  'card_declined': {
    message: 'Cartão recusado',
    userFriendlyMessage: 'O cartão foi recusado pelo banco. Tente novamente ou use outro cartão.',
    suggestions: ['Entrar em contato com o banco', 'Usar outro cartão', 'Tentar novamente mais tarde']
  },
  
  // Erros de subconta
  'invalid_account_data': {
    message: 'Dados da conta inválidos',
    userFriendlyMessage: 'Os dados para criação da subconta estão incompletos ou inválidos.',
    suggestions: ['Verificar todos os campos obrigatórios', 'Validar CPF/CNPJ', 'Verificar endereço completo']
  },
  'account_already_exists': {
    message: 'Conta já existe',
    userFriendlyMessage: 'Já existe uma subconta para este CPF/CNPJ.',
    suggestions: ['Verificar se a conta já foi criada', 'Usar a conta existente']
  },
  'required_documents': {
    message: 'Documentos obrigatórios',
    userFriendlyMessage: 'É necessário enviar documentos para ativar a subconta.',
    suggestions: ['Enviar documentos pessoais', 'Aguardar análise da documentação']
  },
  'account_not_approved': {
    message: 'Conta não aprovada',
    userFriendlyMessage: 'A subconta ainda não foi aprovada. Aguarde a análise.',
    suggestions: ['Aguardar aprovação', 'Verificar se há documentos pendentes']
  },
  
  // Erros de transferência
  'invalid_transfer_value': {
    message: 'Valor de transferência inválido',
    userFriendlyMessage: 'O valor para transferência deve ser maior que zero.',
    suggestions: ['Informar um valor positivo', 'Verificar saldo disponível']
  },
  'insufficient_balance_transfer': {
    message: 'Saldo insuficiente para transferência',
    userFriendlyMessage: 'Você não possui saldo suficiente para esta transferência.',
    suggestions: ['Aguardar compensação de pagamentos', 'Verificar saldo disponível']
  },
  
  // Erros genéricos
  'internal_server_error': {
    message: 'Erro interno do servidor',
    userFriendlyMessage: 'Ocorreu um erro temporário. Tente novamente em alguns minutos.',
    suggestions: ['Tentar novamente mais tarde', 'Entrar em contato com o suporte se persistir']
  },
  'service_unavailable': {
    message: 'Serviço indisponível',
    userFriendlyMessage: 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
    suggestions: ['Aguardar alguns minutos', 'Verificar status do serviço']
  },
  'rate_limit_exceeded': {
    message: 'Muitas requisições',
    userFriendlyMessage: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
    suggestions: ['Aguardar alguns minutos', 'Reduzir frequência de tentativas']
  }
};

/**
 * Extrai código de erro da resposta do Asaas
 */
export function extractAsaasErrorCode(error: any): string | null {
  // Tenta extrair código de erro de diferentes estruturas possíveis
  if (error?.response?.data?.errors?.[0]?.code) {
    return error.response.data.errors[0].code;
  }
  
  if (error?.response?.data?.error?.code) {
    return error.response.data.error.code;
  }
  
  if (error?.code) {
    return error.code;
  }
  
  // Verifica se é erro HTTP padrão
  if (error?.response?.status) {
    switch (error.response.status) {
      case 401:
        return 'unauthorized';
      case 404:
        return 'not_found';
      case 429:
        return 'rate_limit_exceeded';
      case 500:
        return 'internal_server_error';
      case 503:
        return 'service_unavailable';
      default:
        return null;
    }
  }
  
  return null;
}

/**
 * Extrai mensagem de erro da resposta do Asaas
 */
export function extractAsaasErrorMessage(error: any): string | null {
  // Tenta extrair mensagem de erro de diferentes estruturas possíveis
  if (error?.response?.data?.errors?.[0]?.description) {
    return error.response.data.errors[0].description;
  }
  
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return null;
}

/**
 * Converte erro do Asaas para mensagem amigável
 */
export function mapAsaasErrorToUserFriendly(error: any): {
  userFriendlyMessage: string;
  technicalMessage: string;
  suggestions: string[];
  errorCode: string | null;
} {
  const errorCode = extractAsaasErrorCode(error);
  const technicalMessage = extractAsaasErrorMessage(error) || 'Erro desconhecido';
  
  // Tenta encontrar mapeamento específico
  if (errorCode && ASAAS_ERROR_MAPPINGS[errorCode]) {
    const mapping = ASAAS_ERROR_MAPPINGS[errorCode];
    return {
      userFriendlyMessage: mapping.userFriendlyMessage,
      technicalMessage,
      suggestions: mapping.suggestions || [],
      errorCode
    };
  }
  
  // Tenta mapear por palavras-chave na mensagem técnica
  const lowerMessage = technicalMessage.toLowerCase();
  
  if (lowerMessage.includes('cpf') || lowerMessage.includes('cnpj')) {
    return {
      userFriendlyMessage: 'O CPF ou CNPJ informado não é válido. Verifique se foi digitado corretamente.',
      technicalMessage,
      suggestions: ['Verificar formato do CPF/CNPJ', 'Remover pontos e traços'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('email')) {
    return {
      userFriendlyMessage: 'O email informado não é válido. Verifique se foi digitado corretamente.',
      technicalMessage,
      suggestions: ['Verificar formato do email'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('phone') || lowerMessage.includes('telefone')) {
    return {
      userFriendlyMessage: 'O telefone informado não é válido. Use o formato (XX) XXXXX-XXXX.',
      technicalMessage,
      suggestions: ['Incluir DDD', 'Verificar formato'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('cep') || lowerMessage.includes('postal')) {
    return {
      userFriendlyMessage: 'O CEP informado não é válido. Use o formato XXXXX-XXX.',
      technicalMessage,
      suggestions: ['Verificar se o CEP tem 8 dígitos'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('value') || lowerMessage.includes('valor')) {
    return {
      userFriendlyMessage: 'O valor informado não é válido. Deve ser maior que zero.',
      technicalMessage,
      suggestions: ['Informar um valor positivo'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('date') || lowerMessage.includes('data')) {
    return {
      userFriendlyMessage: 'A data informada não é válida. Verifique o formato e se não é uma data passada.',
      technicalMessage,
      suggestions: ['Usar formato DD/MM/AAAA', 'Escolher data futura'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('card') || lowerMessage.includes('cartão')) {
    return {
      userFriendlyMessage: 'Problema com os dados do cartão. Verifique número, validade e código de segurança.',
      technicalMessage,
      suggestions: ['Verificar dados do cartão', 'Tentar outro cartão'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('insufficient') || lowerMessage.includes('saldo')) {
    return {
      userFriendlyMessage: 'Saldo ou limite insuficiente para realizar a operação.',
      technicalMessage,
      suggestions: ['Verificar saldo disponível', 'Aguardar compensação'],
      errorCode
    };
  }
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('não encontrado')) {
    return {
      userFriendlyMessage: 'O item solicitado não foi encontrado. Verifique se as informações estão corretas.',
      technicalMessage,
      suggestions: ['Verificar se o ID está correto', 'Verificar se o item existe'],
      errorCode
    };
  }
  
  // Mensagem padrão para erros não mapeados
  return {
    userFriendlyMessage: 'Ocorreu um problema ao processar sua solicitação. Tente novamente ou entre em contato com o suporte.',
    technicalMessage,
    suggestions: ['Tentar novamente', 'Verificar dados informados', 'Entrar em contato com o suporte'],
    errorCode
  };
} 