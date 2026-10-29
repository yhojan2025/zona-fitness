// ====================================================================
// POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES - ZONA FITNESS
// Marco normativo: Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia)
// ====================================================================

const CURRENT_POLICY_VERSION = 'v1.0-2026';
const POLICY_EFFECTIVE_DATE = '2026-10-26';

const CONSENT_TEXT_SNAPSHOT =
  'Autorizo de manera previa, expresa e informada a ZONA FITNESS (Aguadas, Caldas, Colombia) ' +
  'para el tratamiento de mis datos personales de conformidad con la Ley 1581 de 2012, el Decreto 1377 de 2013 ' +
  'y su Política de Tratamiento de Datos Personales (versión ' + CURRENT_POLICY_VERSION + '), ' +
  'con las finalidades exclusivas de administración de cuenta, control de acceso a instalaciones, ' +
  'prestación de servicios de acondicionamiento físico, facturación y soporte al socio.';

const FULL_POLICY_DOCUMENT = {
  version: CURRENT_POLICY_VERSION,
  effective_date: POLICY_EFFECTIVE_DATE,
  title: 'Política de Tratamiento y Protección de Datos Personales — Zona Fitness',
  responsible: {
    name: 'Zona Fitness',
    location: 'Aguadas, Caldas, Colombia',
    channel: 'Canal oficial de atención al socio en instalaciones y portal web',
  },
  principles: [
    'Legalidad en materia de tratamiento de datos',
    'Finalidad legítima informada al titular',
    'Libertad: tratamiento solo con consentimiento previo, expreso e informado',
    'Veracidad o calidad de la información',
    'Transparencia y acceso garantizado',
    'Seguridad de la información bajo estándares técnicos y administrativos',
    'Confidencialidad debida',
  ],
  purposes: [
    'Gestión y registro de usuarios, socios y expedición de membresías.',
    'Control de acceso, asistencia y seguridad en las instalaciones del gimnasio en Aguadas, Caldas.',
    'Procesamiento de facturación, verificación de pagos y cumplimiento fiscal.',
    'Atención de tickets de soporte técnico e incidencias de servicio.',
    'Notificaciones operativas sobre estado y vencimiento de planes contratados.',
  ],
  minors_policy:
    'En cumplimiento del artículo 7 de la Ley 1581 de 2012 y el artículo 12 del Decreto 1377 de 2013, ' +
    'Zona Fitness fija como edad mínima de admisión e inscripción 14 años cumplidos. ' +
    'Para adolescentes entre 14 y 17 años, el tratamiento de datos responde estrictamente a su interés superior ' +
    'y requiere la manifestación de representación legal por parte de su padre, madre o tutor.',
  rights: [
    'Conocer, actualizar y rectificar sus datos personales frente a Zona Fitness.',
    'Solicitar prueba de la autorización otorgada.',
    'Ser informado respecto del uso que se ha dado a sus datos.',
    'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
    'Revocar la autorización o solicitar la supresión de datos cuando no medie deber legal o contractual.',
    'Acceder de forma gratuita a sus datos personales objeto de tratamiento.',
  ],
  sensitive_data_policy:
    'Zona Fitness no recolecta datos sensibles (datos de salud, biométricos o de origen étnico) en el registro general. ' +
    'Cualquier registro posterior de valoración física o condiciones médicas se realiza bajo consentimiento reforzado e independiente.',
};

module.exports = {
  CURRENT_POLICY_VERSION,
  POLICY_EFFECTIVE_DATE,
  CONSENT_TEXT_SNAPSHOT,
  FULL_POLICY_DOCUMENT,
};
