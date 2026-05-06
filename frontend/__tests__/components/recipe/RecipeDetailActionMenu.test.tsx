// ROADMAP 4.0 RD1.1 — RecipeDetailActionMenu tests.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import RecipeDetailActionMenu from '../../../components/recipe/RecipeDetailActionMenu';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn() },
}));

describe('RecipeDetailActionMenu (RD1.1)', () => {
  const handlers = () => ({
    onEditComposition: jest.fn(),
    onVaryThisPlate: jest.fn(),
    onExportMenu: jest.fn(),
    onShare: jest.fn(),
    onSaveToCollection: jest.fn(),
  });

  it('renders nothing when no rows are visible', () => {
    const { queryByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed={false} canExportMenu={false} />,
    );
    expect(queryByTestId('recipe-detail-action-menu-trigger')).toBeNull();
  });

  it('composed plate shows all five rows', () => {
    const h = handlers();
    const { getByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed canExportMenu {...h} />,
    );
    fireEvent.press(getByTestId('recipe-detail-action-menu-trigger'));
    expect(getByTestId('recipe-detail-action-menu-row-edit')).toBeTruthy();
    expect(getByTestId('recipe-detail-action-menu-row-vary')).toBeTruthy();
    expect(getByTestId('recipe-detail-action-menu-row-export')).toBeTruthy();
    expect(getByTestId('recipe-detail-action-menu-row-share')).toBeTruthy();
    expect(getByTestId('recipe-detail-action-menu-row-save')).toBeTruthy();
  });

  it('non-composed input hides composed-only rows', () => {
    const h = handlers();
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed={false} canExportMenu={false} {...h} />,
    );
    fireEvent.press(getByTestId('recipe-detail-action-menu-trigger'));
    expect(queryByTestId('recipe-detail-action-menu-row-edit')).toBeNull();
    expect(queryByTestId('recipe-detail-action-menu-row-vary')).toBeNull();
    expect(queryByTestId('recipe-detail-action-menu-row-export')).toBeNull();
    expect(getByTestId('recipe-detail-action-menu-row-share')).toBeTruthy();
  });

  it('tapping a row fires the corresponding callback once and closes the sheet', () => {
    const h = handlers();
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed canExportMenu {...h} />,
    );
    fireEvent.press(getByTestId('recipe-detail-action-menu-trigger'));
    fireEvent.press(getByTestId('recipe-detail-action-menu-row-vary'));
    expect(h.onVaryThisPlate).toHaveBeenCalledTimes(1);
    expect(queryByTestId('recipe-detail-action-menu-sheet')).toBeNull();
  });

  it('backdrop press dismisses the sheet without firing a row', () => {
    const h = handlers();
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RecipeDetailActionMenu isComposed canExportMenu {...h} />,
    );
    fireEvent.press(getByTestId('recipe-detail-action-menu-trigger'));
    fireEvent.press(getByTestId('recipe-detail-action-menu-backdrop'));
    expect(queryByTestId('recipe-detail-action-menu-sheet')).toBeNull();
    expect(h.onVaryThisPlate).not.toHaveBeenCalled();
    expect(h.onShare).not.toHaveBeenCalled();
  });
});
