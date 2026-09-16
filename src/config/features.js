/**
 * Interruptores de funcionalidades (feature flags).
 *
 * Pon una a `false` para OCULTARLA en toda la app (menú, rutas y referencias),
 * o a `true` para volver a mostrarla. También puedes cambiarlas con el script:
 *
 *   node scripts/feature.js crm on     # activar CRM
 *   node scripts/feature.js crm off    # ocultar CRM
 *   node scripts/feature.js            # ver el estado actual
 *
 * Tras cambiarla, haz commit/deploy (o reinicia el dev server) para que surta efecto.
 */
export const FEATURES = {
    crm: false,
};

export const isFeatureEnabled = (name) => FEATURES[name] !== false;
