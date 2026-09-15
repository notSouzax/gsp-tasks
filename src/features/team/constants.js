/**
 * Constantes del apartado de Equipo (Team Hub).
 * Categorías de la documentación: cada una define su etiqueta, icono
 * (material-symbols-outlined) y color base para la UI.
 */

// "Cambios" ya no es una categoría de documentación: tiene su propia pestaña
// (muro/changelog). Se mantiene su metadato para estilos y para resolver
// documentos antiguos que pudieran tener esta categoría.
export const CAMBIOS_CATEGORY = {
    id: 'cambios',
    label: 'Cambios en el programa',
    shortLabel: 'Cambios',
    icon: 'campaign',
    color: 'indigo',
    description: 'Novedades y cambios recientes en la aplicación',
};

export const DOC_CATEGORIES = [
    {
        id: 'videotutoriales',
        label: 'Videotutoriales',
        shortLabel: 'Vídeos',
        icon: 'play_circle',
        color: 'rose',
        description: 'Tutoriales en vídeo paso a paso',
    },
    {
        id: 'manuales_programa',
        label: 'Manuales del programa',
        shortLabel: 'Manuales',
        icon: 'menu_book',
        color: 'cyan',
        description: 'Documentación de uso de la aplicación',
    },
    {
        id: 'procedimientos',
        label: 'Procedimientos internos',
        shortLabel: 'Procedimientos',
        icon: 'checklist',
        color: 'amber',
        description: 'Manuales de procedimientos y procesos del departamento',
    },
];

const ALL_CATEGORIES = [CAMBIOS_CATEGORY, ...DOC_CATEGORIES];

export const getCategory = (id) =>
    ALL_CATEGORIES.find((c) => c.id === id) || DOC_CATEGORIES[1];

/**
 * Clases de Tailwind por color de categoría. Se definen de forma estática
 * (no interpoladas) para que Tailwind no las purgue en el build.
 */
export const CATEGORY_STYLES = {
    indigo: {
        text: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        ring: 'ring-indigo-500/30',
        gradient: 'from-indigo-500/20 to-indigo-500/5',
        solid: 'bg-indigo-500',
        chipActive: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/40',
    },
    rose: {
        text: 'text-rose-500',
        bg: 'bg-rose-500/10',
        ring: 'ring-rose-500/30',
        gradient: 'from-rose-500/20 to-rose-500/5',
        solid: 'bg-rose-500',
        chipActive: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/40',
    },
    cyan: {
        text: 'text-cyan-500',
        bg: 'bg-cyan-500/10',
        ring: 'ring-cyan-500/30',
        gradient: 'from-cyan-500/20 to-cyan-500/5',
        solid: 'bg-cyan-500',
        chipActive: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 ring-1 ring-cyan-500/40',
    },
    amber: {
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        ring: 'ring-amber-500/30',
        gradient: 'from-amber-500/20 to-amber-500/5',
        solid: 'bg-amber-500',
        chipActive: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/40',
    },
};

export const getCategoryStyle = (color) => CATEGORY_STYLES[color] || CATEGORY_STYLES.cyan;

export const STORAGE_BUCKET = 'team-docs';

/** Tamaño máximo de archivo subido directamente (MB). Para vídeos pesados, usar enlace. */
export const MAX_FILE_MB = 50;
