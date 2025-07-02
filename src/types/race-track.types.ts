/**
 * Configuração de um traçado individual
 */
export interface TrackLayout {
  /** Nome do traçado (ex: "Traçado Principal", "Traçado Reverso", "Traçado Curto") */
  name: string;
  
  /** Comprimento do traçado em metros */
  length: number;
  
  /** Descrição do traçado */
  description?: string;
}

/**
 * Configuração de uma frota padrão
 */
export interface DefaultFleet {
  /** Nome da frota (ex: "Frota 1", "Frota 2", "Frota Premium") */
  name: string;
  
  /** Quantidade de karts na frota */
  kartQuantity: number;
}

/**
 * Array de configurações de traçados para um kartódromo
 */
export type TrackLayouts = TrackLayout[];

/**
 * Array de configurações de frotas para um kartódromo
 */
export type DefaultFleets = DefaultFleet[];

/**
 * Validação básica para TrackLayout
 */
export const validateTrackLayout = (track: TrackLayout): string[] => {
  const errors: string[] = [];
  
  if (!track.name || track.name.trim().length === 0) {
    errors.push('Nome do traçado é obrigatório');
  }
  
  if (track.length <= 0) {
    errors.push('Comprimento do traçado deve ser maior que 0');
  }
  
  return errors;
};

/**
 * Validação básica para DefaultFleet
 */
export const validateDefaultFleet = (fleet: DefaultFleet): string[] => {
  const errors: string[] = [];
  
  if (!fleet.name || fleet.name.trim().length === 0) {
    errors.push('Nome da frota é obrigatório');
  }
  
  if (fleet.kartQuantity <= 0) {
    errors.push('Quantidade de karts deve ser maior que 0');
  }
  
  return errors;
};

/**
 * Validação para array de traçados
 */
export const validateTrackLayouts = (tracks: TrackLayouts): string[] => {
  const errors: string[] = [];
  
  if (!Array.isArray(tracks)) {
    errors.push('Traçados devem ser um array');
    return errors;
  }
  
  if (tracks.length === 0) {
    errors.push('Pelo menos um traçado deve ser configurado');
    return errors;
  }
  
  // Validar cada traçado individualmente
  tracks.forEach((track, index) => {
    const trackErrors = validateTrackLayout(track);
    trackErrors.forEach(error => {
      errors.push(`Traçado ${index + 1}: ${error}`);
    });
  });
  
  // Validar nomes únicos
  const names = tracks.map(t => t.name.trim().toLowerCase());
  const uniqueNames = [...new Set(names)];
  if (names.length !== uniqueNames.length) {
    errors.push('Nomes dos traçados devem ser únicos');
  }
  
  return errors;
};

/**
 * Validação para array de frotas
 */
export const validateDefaultFleets = (fleets: DefaultFleets): string[] => {
  const errors: string[] = [];
  
  if (!Array.isArray(fleets)) {
    errors.push('Frotas devem ser um array');
    return errors;
  }
  
  if (fleets.length === 0) {
    errors.push('Pelo menos uma frota deve ser configurada');
    return errors;
  }
  
  // Validar cada frota individualmente
  fleets.forEach((fleet, index) => {
    const fleetErrors = validateDefaultFleet(fleet);
    fleetErrors.forEach(error => {
      errors.push(`Frota ${index + 1}: ${error}`);
    });
  });
  
  // Validar nomes únicos
  const names = fleets.map(f => f.name.trim().toLowerCase());
  const uniqueNames = [...new Set(names)];
  if (names.length !== uniqueNames.length) {
    errors.push('Nomes das frotas devem ser únicos');
  }
  
  return errors;
}; 