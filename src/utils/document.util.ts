/**
 * Remove a máscara de documentos (CPF/CNPJ), mantendo apenas números
 * @param document CPF/CNPJ com ou sem máscara
 * @returns String contendo apenas números
 */
export function removeDocumentMask(document: string): string {
  if (!document) return document;
  return document.replace(/\D/g, '');
}

/**
 * Valida se o documento (após remoção da máscara) tem tamanho correto
 * @param document Documento sem máscara
 * @returns true se for CPF (11 dígitos) ou CNPJ (14 dígitos)
 */
export function isValidDocumentLength(document: string): boolean {
  const cleanDocument = removeDocumentMask(document);
  return cleanDocument.length === 11 || cleanDocument.length === 14;
}

/**
 * Determina se o documento é CPF ou CNPJ baseado na quantidade de dígitos
 * @param document Documento com ou sem máscara
 * @returns 'CPF' | 'CNPJ' | 'INVALID'
 */
export function getDocumentType(document: string): 'CPF' | 'CNPJ' | 'INVALID' {
  const cleanDocument = removeDocumentMask(document);
  
  if (cleanDocument.length === 11) {
    return 'CPF';
  } else if (cleanDocument.length === 14) {
    return 'CNPJ';
  }
  
  return 'INVALID';
} 