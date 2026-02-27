/** Remove traços e espaços da placa, retorna em maiúsculo. Ex: "ABC-1D23" → "ABC1D23" */
export const formatPlaca = (placa: string): string => placa.replace(/[-\s]/g, '').toUpperCase();
