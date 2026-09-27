export const CATEGORIES = [
  'Groceries',
  'Dining & cafes',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Health',
  'Entertainment',
  'Subscriptions',
  'Fees & interest',
  'Buy Now Pay Later',
  'Income & refunds',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Categories that are shown on the dashboard but left out of spending totals. Buy Now Pay Later
 * repayments pay off purchases made earlier, so counting them as spending would count those
 * purchases twice.
 */
export const EXCLUDED_FROM_SPENDING: readonly string[] = ['Buy Now Pay Later', 'Income & refunds'];

const RULES: [RegExp, Category][] = [
  [/\b(steppay|afterpay|zip ?pay|zip ?money|klarna|humm|latitude pay|paypal pay in 4)\b/i, 'Buy Now Pay Later'],
  [/\b(interest|fee|charge)\b/i, 'Fees & interest'],
  [/\b(woolworths|coles|aldi|iga|harris farm|costco|butcher|grocer|mini ?mart|supermarket|spice|fruit|market)\b/i, 'Groceries'],
  [/\b(cafe|coffee|piccolo|espresso|bakery|restaurant|kitchen|pizza|burger|sushi|kebab|mcdonald|kfc|hungry jack|subway|uber ?eats|doordash|menulog)\b/i, 'Dining & cafes'],
  [/\b(uber|didi|ola|opal|transport|taxi|parking|toll|linkt|fuel|petrol|ampol|caltex|bp|shell|7-eleven)\b/i, 'Transport'],
  [/\b(netflix|spotify|disney|stan|youtube|apple\.com|google|microsoft|adobe|resume|subscription|prime)\b/i, 'Subscriptions'],
  [/\b(pharmacy|chemist|medical|dental|doctor|clinic|hospital|physio)\b/i, 'Health'],
  [/\b(electricity|energy|agl|origin|water|telstra|optus|vodafone|internet|insurance|council)\b/i, 'Bills & utilities'],
  [/\b(cinema|hoyts|event|ticketek|steam|playstation|xbox)\b/i, 'Entertainment'],
  [/\b(kmart|target|big w|bunnings|jb hi-fi|officeworks|amazon|ebay|ikea|myer|david jones)\b/i, 'Shopping'],
];

/** Picks a category from the merchant text. Money coming in is always income or a refund. */
export function categorize(text: string, amountCents: number): Category {
  if (amountCents < 0) return 'Income & refunds';
  for (const [pattern, category] of RULES) {
    if (pattern.test(text)) return category;
  }
  return 'Other';
}

export function countsAsSpending(category: string): boolean {
  return !EXCLUDED_FROM_SPENDING.includes(category);
}
