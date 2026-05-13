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
  | 'coachWeeklyCheckin'
  | 'preDinnerNudge'
  | 'cuisineDrought'
  | 'lapsedDay3'
  | 'lapsedDay7';

export const TEMPLATE_IDS: readonly PushTemplateId[] = [
  'shoppingListReady',
  'mealPlanReady',
  'planReminder',
  'expiringSoon',
  'weeklyDigest',
  'coachWeeklyCheckin',
  'preDinnerNudge',
  'cuisineDrought',
  'lapsedDay3',
  'lapsedDay7',
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
  /** Optional weekday label (e.g. "Tuesday") — pushed into the preview when
   * available so the lock-screen reads as specific, not generic. */
  dayName?: string;
  /** Optional dominant ingredient category ("produce", "pantry", "dairy")
   * for an at-a-glance hint of what's mostly on the list. */
  dominantCategory?: string;
}

function shoppingListReady(
  locale: string | null | undefined,
  args: ShoppingListReadyArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const n = args.itemCount;
  const day = args.dayName?.trim();
  const cat = args.dominantCategory?.trim();
  if (lang === 'es') {
    const title = day ? `Lista del ${day.toLowerCase()}` : 'Tu lista de compras está lista';
    const body = cat
      ? `${n} ${n === 1 ? 'artículo' : 'artículos'} — mayormente ${cat.toLowerCase()}.`
      : `${n} ${n === 1 ? 'artículo' : 'artículos'} — toca para ver.`;
    return { title, body };
  }
  if (lang === 'pt') {
    const title = day ? `Lista de ${day.toLowerCase()}` : 'Sua lista de compras está pronta';
    const body = cat
      ? `${n} ${n === 1 ? 'item' : 'itens'} — quase tudo ${cat.toLowerCase()}.`
      : `${n} ${n === 1 ? 'item' : 'itens'} — toque para ver.`;
    return { title, body };
  }
  if (lang === 'fr') {
    const title = day ? `Liste de ${day.toLowerCase()}` : 'Ta liste de courses est prête';
    const body = cat
      ? `${n} article${n !== 1 ? 's' : ''} — surtout du ${cat.toLowerCase()}.`
      : `${n} article${n !== 1 ? 's' : ''} — touche pour voir.`;
    return { title, body };
  }
  const title = day ? `${day}'s list` : 'Your shopping list is ready';
  const body = cat
    ? `${n} item${n !== 1 ? 's' : ''} — mostly ${cat.toLowerCase()}.`
    : `${n} item${n !== 1 ? 's' : ''} — tap to view.`;
  return { title, body };
}

interface MealPlanReadyArgs {
  /** Optional count of distinct cuisines in the plan — adds a discovery hook
   * to the preview ("across 5 cuisines"). */
  cuisineCount?: number;
  /** Optional count of meals planned. */
  dayCount?: number;
}

function mealPlanReady(
  locale: string | null | undefined,
  args: MealPlanReadyArgs = {},
): PushPayload {
  const lang = baseLocale(locale);
  const days = args.dayCount;
  const cuisines = args.cuisineCount;
  const hasDetail = typeof days === 'number' && typeof cuisines === 'number' && days > 0;

  if (lang === 'es') {
    return {
      title: '¡Tu plan está listo!',
      body: hasDetail
        ? `${days} comidas, ${cuisines} ${cuisines === 1 ? 'cocina' : 'cocinas'} — toca para ver.`
        : 'Toca para ver tu semana de un vistazo.',
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Seu plano está pronto!',
      body: hasDetail
        ? `${days} refeições em ${cuisines} ${cuisines === 1 ? 'cozinha' : 'cozinhas'} — toque para ver.`
        : 'Toque para ver sua semana de relance.',
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Ton menu est prêt !',
      body: hasDetail
        ? `${days} repas, ${cuisines} cuisine${cuisines === 1 ? '' : 's'} — touche pour voir.`
        : 'Touche pour voir ta semaine en un coup d’œil.',
    };
  }
  return {
    title: 'Your plan is ready!',
    body: hasDetail
      ? `${days} meals across ${cuisines} cuisine${cuisines === 1 ? '' : 's'} — tap to view.`
      : 'Tap to see your week at a glance.',
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
  /** Optional top cuisine of the week — appears in the preview when set. */
  topCuisine?: string;
}

function weeklyDigest(
  locale: string | null | undefined,
  args: WeeklyDigestArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const n = args.activityCount;
  const top = args.topCuisine?.trim();
  if (lang === 'es') {
    const body = top
      ? `${n} ${n === 1 ? 'comida' : 'comidas'} esta semana — mayormente ${top.toLowerCase()}.`
      : `Cocinaste ${n} ${n === 1 ? 'comida' : 'comidas'} esta semana. Toca para ver tu resumen.`;
    return { title: 'Tu semana de un vistazo', body };
  }
  if (lang === 'pt') {
    const body = top
      ? `${n} ${n === 1 ? 'refeição' : 'refeições'} esta semana — quase tudo ${top.toLowerCase()}.`
      : `Você cozinhou ${n} ${n === 1 ? 'refeição' : 'refeições'} esta semana. Toque para ver o resumo.`;
    return { title: 'Sua semana de relance', body };
  }
  if (lang === 'fr') {
    const body = top
      ? `${n} repas cette semaine — surtout ${top.toLowerCase()}.`
      : `Tu as cuisiné ${n} repas cette semaine. Touche pour voir ton résumé.`;
    return { title: 'Ta semaine en un coup d’œil', body };
  }
  const body = top
    ? `${n} meal${n !== 1 ? 's' : ''} this week — mostly ${top}. Tap for the recap.`
    : `You cooked ${n} meal${n !== 1 ? 's' : ''} this week! Tap for your summary.`;
  return { title: 'Your week at a glance', body };
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

interface PreDinnerNudgeArgs {
  /** Suggested cuisine for tonight (e.g. "Persian"). */
  suggestedCuisine: string;
  /** Optional dish name for extra specificity (e.g. "fesenjan"). */
  dishHint?: string;
}

function preDinnerNudge(
  locale: string | null | undefined,
  args: PreDinnerNudgeArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const cuisine = args.suggestedCuisine.trim();
  const dish = args.dishHint?.trim();
  if (lang === 'es') {
    return {
      title: '¿Qué se cocina?',
      body: dish
        ? `Esta noche, ¿algo ${cuisine.toLowerCase()}? ${dish} estaría buenísimo.`
        : `Esta noche, ¿algo ${cuisine.toLowerCase()}?`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'O que vai cozinhar?',
      body: dish
        ? `Hoje à noite, que tal algo ${cuisine.toLowerCase()}? ${dish} cairia bem.`
        : `Hoje à noite, que tal algo ${cuisine.toLowerCase()}?`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'On cuisine quoi ?',
      body: dish
        ? `Ce soir, envie de ${cuisine.toLowerCase()} ? ${dish}, peut-être ?`
        : `Ce soir, envie de ${cuisine.toLowerCase()} ?`,
    };
  }
  return {
    title: "What's cooking?",
    body: dish
      ? `Fancy something ${cuisine} tonight? ${dish} would hit.`
      : `Fancy something ${cuisine} tonight?`,
  };
}

interface CuisineDroughtArgs {
  /** The quiet cuisine (e.g. "Persian"). */
  cuisine: string;
  /** Days since the last cook in that cuisine. */
  daysSince: number;
}

function cuisineDrought(
  locale: string | null | undefined,
  args: CuisineDroughtArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const cuisine = args.cuisine.trim();
  const n = args.daysSince;
  if (lang === 'es') {
    return {
      title: `${cuisine} ha estado callado`,
      body: `Hace ${n} días que no cocinas ${cuisine.toLowerCase()}. ¿Algo así esta noche?`,
    };
  }
  if (lang === 'pt') {
    return {
      title: `${cuisine} anda quieto`,
      body: `Faz ${n} dias que você não cozinha ${cuisine.toLowerCase()}. Que tal hoje?`,
    };
  }
  if (lang === 'fr') {
    return {
      title: `${cuisine}, ça fait un moment`,
      body: `${n} jours sans ${cuisine.toLowerCase()}. On rattrape ce soir ?`,
    };
  }
  return {
    title: `${cuisine} has been quiet`,
    body: `You haven't had ${cuisine} flavors in ${n} days. Something tonight?`,
  };
}

interface LapsedArgs {
  /** The user's top cuisine, used as the re-entry hook. */
  topCuisine: string;
}

function lapsedDay3(
  locale: string | null | undefined,
  args: LapsedArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const c = args.topCuisine.trim();
  if (lang === 'es') {
    return {
      title: 'Sazon te extraña',
      body: `Hay un nuevo plato ${c.toLowerCase()} que te encantaría.`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Sazon sentiu sua falta',
      body: `Tem um prato ${c.toLowerCase()} novo que você ia amar.`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Sazon te cherche',
      body: `Un nouveau plat ${c.toLowerCase()} qui te plairait bien.`,
    };
  }
  return {
    title: 'Sazon missed you',
    body: `There's a new ${c} dish you'd love.`,
  };
}

function lapsedDay7(
  locale: string | null | undefined,
  args: LapsedArgs,
): PushPayload {
  const lang = baseLocale(locale);
  const c = args.topCuisine.trim();
  if (lang === 'es') {
    return {
      title: 'Sazon no te ve hace una semana',
      body: `Algo nuevo en ${c.toLowerCase()} — ¿le echamos un ojo?`,
    };
  }
  if (lang === 'pt') {
    return {
      title: 'Sazon não te vê há uma semana',
      body: `Algo novo em ${c.toLowerCase()} — vamos dar uma olhada?`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Une semaine sans toi',
      body: `Du nouveau en ${c.toLowerCase()} — on regarde ?`,
    };
  }
  return {
    title: "Sazon hasn't seen you in a while",
    body: `There's a new ${c} dish you'd love.`,
  };
}

export const pushCopy = {
  shoppingListReady,
  mealPlanReady,
  planReminder,
  expiringSoon,
  weeklyDigest,
  coachWeeklyCheckin,
  preDinnerNudge,
  cuisineDrought,
  lapsedDay3,
  lapsedDay7,
};
