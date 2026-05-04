// Voice-add endpoint test: routes utterance through voiceRecipeResolver,
// either forwards to generate-from-recipes or adds a literal item to the active list.

import { Request, Response } from 'express';
import { shoppingListController } from '../../src/modules/shoppingList/shoppingListController';
import { shoppingListGenerationController } from '../../src/modules/shoppingList/shoppingListGenerationController';
import { prisma } from '../../src/lib/prisma';
import * as voiceResolver from '../../src/services/voiceRecipeResolver';
import * as lifecycleService from '../../src/services/shoppingListLifecycleService';

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'user-123'),
}));

jest.mock('../../src/services/voiceRecipeResolver');
jest.mock('../../src/services/shoppingListLifecycleService', () => ({
  ...jest.requireActual('../../src/services/shoppingListLifecycleService'),
  getActiveList: jest.fn(),
  setActiveList: jest.fn(),
}));

describe('POST /api/shopping-lists/voice-add', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusFn: jest.Mock;
  let jsonFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonFn = jest.fn();
    statusFn = jest.fn(() => ({ json: jsonFn }));
    res = { status: statusFn as any, json: jsonFn };
  });

  it('returns 400 when utterance is missing', async () => {
    req = { body: {} };
    await shoppingListController.voiceAdd(req as Request, res as Response);
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Utterance is required' });
  });

  it('returns 400 when utterance is empty string', async () => {
    req = { body: { utterance: '   ' } };
    await shoppingListController.voiceAdd(req as Request, res as Response);
    expect(statusFn).toHaveBeenCalledWith(400);
  });

  it('forwards to generate-from-recipes when matchType is recipe with high confidence', async () => {
    (voiceResolver.resolveVoiceUtterance as jest.Mock).mockResolvedValue({
      matchType: 'recipe',
      recipeId: 'recipe-xyz',
      confidence: 0.92,
      name: 'Thai Basil Chicken',
    });

    let capturedBody: unknown = null;
    const generateSpy = jest
      .spyOn(shoppingListGenerationController, 'generateFromRecipes')
      .mockImplementation(async (innerReq: Request) => {
        // Capture body at call-time (it should be the forwarded recipeIds shape)
        capturedBody = (innerReq as any).body;
        return undefined as any;
      });

    req = { body: { utterance: 'Thai basil chicken' } };
    await shoppingListController.voiceAdd(req as Request, res as Response);

    expect(generateSpy).toHaveBeenCalled();
    // While generateFromRecipes ran it saw the forwarded body…
    expect(capturedBody).toEqual({ recipeIds: ['recipe-xyz'] });
    // …and after the call returns, the original body is unmutated.
    expect((req as any).body).toEqual({ utterance: 'Thai basil chicken' });
    generateSpy.mockRestore();
  });

  it('falls back to literal-add when matchType is literal', async () => {
    (voiceResolver.resolveVoiceUtterance as jest.Mock).mockResolvedValue({
      matchType: 'literal',
      confidence: 0.2,
      name: 'milk',
    });
    (lifecycleService.getActiveList as jest.Mock).mockResolvedValue({
      id: 'list-active',
      userId: 'user-123',
    });
    (prisma.shoppingListItem.create as jest.Mock).mockResolvedValue({
      id: 'item-new',
      shoppingListId: 'list-active',
      name: 'milk',
    });

    req = { body: { utterance: 'milk' } };
    await shoppingListController.voiceAdd(req as Request, res as Response);

    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shoppingListId: 'list-active',
          name: 'milk',
          quantity: '1',
        }),
      }),
    );
    expect(statusFn).toHaveBeenCalledWith(201);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        matchType: 'literal',
        confidence: 0.2,
        listId: 'list-active',
        itemId: 'item-new',
      }),
    );
  });

  it('returns 500 on resolver error', async () => {
    (voiceResolver.resolveVoiceUtterance as jest.Mock).mockRejectedValue(new Error('boom'));
    req = { body: { utterance: 'milk' } };
    await shoppingListController.voiceAdd(req as Request, res as Response);
    expect(statusFn).toHaveBeenCalledWith(500);
  });
});
