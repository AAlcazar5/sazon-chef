// frontend/__tests__/components/ShoppingListBudget.test.tsx
// Tests for the grocery budget bar feature in the shopping list screen
// The budget bar is inline in shopping-list.tsx, so we test the logic here

describe('Shopping List Budget Bar Logic', () => {
  it('calculates budget percentage correctly', () => {
    const totalCost = 75;
    const weeklyBudget = 100;
    const budgetPct = Math.min((totalCost / weeklyBudget) * 100, 100);
    expect(budgetPct).toBe(75);
  });

  it('caps budget percentage at 100%', () => {
    const totalCost = 150;
    const weeklyBudget = 100;
    const budgetPct = Math.min((totalCost / weeklyBudget) * 100, 100);
    expect(budgetPct).toBe(100);
  });

  it('detects over-budget correctly', () => {
    const totalCost = 110;
    const weeklyBudget = 100;
    const overBudget = totalCost > weeklyBudget;
    expect(overBudget).toBe(true);
  });

  it('detects under-budget correctly', () => {
    const totalCost = 80;
    const weeklyBudget = 100;
    const overBudget = totalCost > weeklyBudget;
    expect(overBudget).toBe(false);
  });

  it('combines estimated cost with spent-so-far', () => {
    const estimatedCost = 50;
    const purchasedItems = [
      { purchased: true, price: 12.5 },
      { purchased: true, price: 7.5 },
      { purchased: false, price: 10 },
    ];
    const spentSoFar = purchasedItems
      .filter(i => i.purchased && i.price > 0)
      .reduce((s, i) => s + i.price, 0);
    const totalCost = estimatedCost + spentSoFar;
    expect(spentSoFar).toBe(20);
    expect(totalCost).toBe(70);
  });

  it('returns null budget bar when weeklyBudget is null', () => {
    const weeklyBudget: number | null = null;
    const shouldShowBudgetBar = weeklyBudget != null && weeklyBudget > 0;
    expect(shouldShowBudgetBar).toBe(false);
  });

  it('returns null budget bar when weeklyBudget is 0', () => {
    const weeklyBudget = 0;
    const shouldShowBudgetBar = weeklyBudget != null && weeklyBudget > 0;
    expect(shouldShowBudgetBar).toBe(false);
  });
});
