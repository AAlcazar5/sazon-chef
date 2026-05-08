// ROADMAP 4.0 i18n-OPS3.3 — locale-aware push notification copy.
//
// Single source of truth for every push template's title + body across
// supported locales. Walks the BCP 47 fallback chain (es-MX → es → en,
// pt-BR → pt → en) so the regional variants we already serve in the coach
// persona automatically inherit notification copy without duplicating
// strings.
//
// Templates are pure functions of (locale, args) → { title, body }. The
// delivery layer (`pushNotificationService`) stays locale-agnostic; callers
// resolve the user's locale and pass the rendered strings down.

import { resolveCoachLocale, type CoachLocale } from './coachPromptService';

export type PushTemplateId =
  | 'shoppingListReady'
  | 'mealPlanReady'
  | 'planReminder'
  | 'expiringSoon'
  | 'weeklyDigest'
  | 'coachWeeklyCheckin';

export const TEMPLATE_IDS: readonly PushTemplateId[] = [
  'shoppingListReady',
  'mealPlanReady',
  'planReminder',
  'expiringSoon',
  'weeklyDigest',
  'coachWeeklyCheckin',
] as const;

export interface PushPayload {
  title: string;
  body: string;
}

type BaseLocale = 'en' | 'es' | 'pt' | 'fr';

function baseLocale(locale: string | null | undefined): BaseLocale {
  const resolved: CoachLocale = resolveCoachLocale(locale);
  if (resolved.startsWith('es')) return 'es';
  if (resolved.startsWith('pt')) return 'pt';
  if (resolved.startsWith('fr')) return 'fr';
  return 'en';
}

// ─── Templates ───────────────────────────────────────────────────────────

interface ShoppingListReadyArgs {
  itemCount: number;
}

function shoppingListReady(
  locale: string | null | undefined,
  args: ShoppingListReadyArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const n = args.itemCount;
  if (lang === 'es') {
    return {
      title: 'Tu lista de compras está lista',
      body: `${n} ${n === 1 ? 'artículo' : 'artículos'} — toca para ver.`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Sua lista de compras está pronta',
      body: `${n} ${n === 1 ? 'item' : 'itens'} — toque para ver.`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Ta liste de courses est prête',
      body: `${n} article${n !== 1 ? 's' : ''} — touche pour voir.`,
    };
  }
  return {
    title: 'Your shopping list is ready',
    body: `${n} item${n !== 1 ? 's' : ''} — tap to view.`,
  };
}

function mealPlanReady(locale: string | null | undefined): PushPayload {
  const lang = baseLocale(locale);
  if (lang === 'es') {
    return {
      title: '¡Tu plan de comidas está listo!',
      body: 'Toca para ver tu semana de un vistazo.',
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Seu plano de refeições está pronto!',
      body: 'Toque para ver sua semana de relance.',
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Ton menu de la semaine est prêt !',
      body: 'Touche pour voir ta semaine en un coup d’œil.',
    };
  }
  return {
    title: 'Your meal plan is ready!',
    body: 'Tap to see your week at a glance.',
  };
}

function planReminder(locale: string | null | undefined): PushPayload {
  const lang = baseLocale(locale);
  if (lang === 'es') {
    return {
      title: '¿Planeamos la semana?',
      body: '¿Quieres que planee la próxima semana? Toma 10 segundos.',
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Planejar a semana?',
      body: 'Quer que eu planeje a próxima semana? Leva 10 segundos.',
    };
  }
  if (lang === 'fr') {
    return {
      title: 'On planifie la semaine ?',
      body: 'Tu veux que je planifie la semaine prochaine ? Ça prend 10 secondes.',
    };
  }
  return {
    title: 'Plan your week?',
    body: 'Want me to plan next week? Takes 10 seconds.',
  };
}

interface ExpiringSoonArgs {
  titles: string[];
}

function expiringSoon(
  locale: string | null | undefined,
  args: ExpiringSoonArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const count = args.titles.length;
  const first = args.titles[0] ?? '';
  if (lang === 'es') {
    return {
      title: 'Vence pronto',
      body:
        count === 1
          ? `${first} vence pronto — aquí van algunas recetas rápidas.`
          : `${count} ingredientes vencen pronto — ¡úsalos antes de que se echen a perder!`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Vence em breve',
      body:
        count === 1
          ? `${first} vence em breve — aqui vão algumas receitas rápidas.`
          : `${count} ingredientes vencem em breve — use antes que estraguem!`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Bientôt périmé',
      body:
        count === 1
          ? `${first} expire bientôt — voici quelques recettes rapides.`
          : `${count} ingrédients expirent bientôt — utilise-les avant qu'ils ne s'abîment !`,
    };
  }
  return {
    title: 'Expiring soon',
    body:
      count === 1
        ? `${first} expires soon — here are some quick recipes.`
        : `${count} items expire soon — use them before they go!`,
  };
}

interface WeeklyDigestArgs {
  activityCount: number;
}

function weeklyDigest(
  locale: string | null | undefined,
  args: WeeklyDigestArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const n = args.activityCount;
  if (lang === 'es') {
    return {
      title: 'Tu semana de un vistazo',
      body: `Cocinaste ${n} ${n === 1 ? 'comida' : 'comidas'} esta semana. Toca para ver tu resumen.`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Sua semana de relance',
      body: `Você cozinhou ${n} ${n === 1 ? 'refeição' : 'refeições'} esta semana. Toque para ver o resumo.`,
    };
  }
  if (lang === 'fr') {
    // "repas" is invariable in French — same form for singular and plural.
    return {
      title: 'Ta semaine en un coup d’œil',
      body: `Tu as cuisiné ${n} repas cette semaine. Touche pour voir ton résumé.`,
    };
  }
  return {
    title: 'Your week at a glance',
    body: `You cooked ${n} meal${n !== 1 ? 's' : ''} this week! Tap for your summary.`,
  };
}

function coachWeeklyCheckin(locale: string | null | undefined): PushPayload {
  const lang = baseLocale(locale);
  if (lang === 'es') {
    return { title: 'Hola — ¿qué tal va?', body: '' };
  }
  if (lang === 'pt') {
    return { title: 'Oi — tudo bem?', body: '' };
  }
  if (lang === 'fr') {
    return { title: 'Salut — ça va ?', body: '' };
  }
  return { title: 'Hey — quick check-in?', body: '' };
}

export const pushCopy = {
  shoppingListReady,
  mealPlanReady,
  planReminder,
  expiringSoon,
  weeklyDigest,
  coachWeeklyCheckin,
};
