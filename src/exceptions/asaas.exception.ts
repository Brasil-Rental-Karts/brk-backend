export class AsaasException extends Error {
  public readonly userFriendlyMessage: string;
  public readonly technicalMessage: string;
  public readonly suggestions: string[];
  public readonly errorCode: string | null;
  public readonly httpStatus: number;

  constructor(
    userFriendlyMessage: string, 
    technicalMessage: string, 
    suggestions: string[] = [],
    errorCode: string | null = null,
    httpStatus: number = 400
  ) {
    super(userFriendlyMessage);
    this.name = 'AsaasException';
    this.userFriendlyMessage = userFriendlyMessage;
    this.technicalMessage = technicalMessage;
    this.suggestions = suggestions;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }

  /**
   * Retorna resposta formatada para o frontend
   */
  toResponse() {
    return {
      message: this.userFriendlyMessage,
      technicalMessage: this.technicalMessage,
      suggestions: this.suggestions,
      errorCode: this.errorCode,
      type: 'asaas_error'
    };
  }
} 