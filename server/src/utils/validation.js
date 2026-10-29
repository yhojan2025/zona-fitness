// ====================================================================
// UTILIDADES DE VALIDACIÓN Y CÁLCULO DE EDAD - ZONA FITNESS
// Cumplimiento de Ley 1581 de 2012 y requisitos de edad mínima
// ====================================================================

/**
 * Valida formato y calendario real de una fecha de nacimiento,
 * verificando que no sea futura y calculando la edad exacta.
 *
 * @param {string} birthDateStr Fecha en formato YYYY-MM-DD
 * @param {Date} [referenceDate] Fecha de referencia (por defecto hoy)
 */
function parseAndValidateBirthDate(birthDateStr, referenceDate = new Date()) {
  if (!birthDateStr || typeof birthDateStr !== 'string') {
    return { valid: false, error: 'La fecha de nacimiento es obligatoria en formato AAAA-MM-DD' };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateStr.trim());
  if (!match) {
    return { valid: false, error: 'Formato de fecha de nacimiento inválido. Debe ser AAAA-MM-DD (ej. 1995-08-20)' };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, error: 'La fecha de nacimiento contiene valores de mes o día fuera de rango' };
  }

  const birthDate = new Date(year, month - 1, day);
  // Verificar coherencia con calendario (evita ej. 30 de febrero)
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { valid: false, error: 'La fecha indicada no existe en el calendario' };
  }

  // Normalizar fecha de referencia a medianoche local para cálculo exacto
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (birthDate > today) {
    return { valid: false, error: 'La fecha de nacimiento no puede ser una fecha futura' };
  }

  // Cálculo exacto de edad considerando mes y día de cumpleaños
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age > 120) {
    return { valid: false, error: 'Por favor ingrese una fecha de nacimiento válida' };
  }

  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    valid: true,
    birthDate,
    age,
    formattedDate,
    isMinor: age < 18,
    isAllowed: age >= 14,
  };
}

/**
 * Valida formato estándar de correo electrónico
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
}

module.exports = {
  parseAndValidateBirthDate,
  isValidEmail,
};
