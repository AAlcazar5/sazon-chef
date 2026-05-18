// W-D1 — no-recipe-count law regression. The home grid paginator must NOT
// render the catalog-count eyebrow ("1–11 OF 11954 RECIPES") nor a page
// denominator ("of 1087"). Recipes are a like-signal store, not a countable
// catalog; pagination is seamless (no visible denominator). Prev/Next + the
// bare current page still render.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PaginationControls from '../../../components/home/PaginationControls';

const baseProps = {
  currentPage: 0,
  totalItems: 11954,
  itemsShown: 11,
  paginationInfo: {
    totalPages: 1087,
    isFirstPage: true,
    isLastPage: false,
    hasMultiplePages: true,
  },
  isLoading: false,
  onPrevPage: jest.fn(),
  onNextPage: jest.fn(),
};

describe('PaginationControls — no recipe count / no denominator (W-D1)', () => {
  it('does not render the "N–M OF {total} RECIPES" catalog eyebrow', () => {
    const { queryByText } = render(<PaginationControls {...baseProps} />);
    expect(queryByText(/OF\s+\d+\s+RECIPES/i)).toBeNull();
    expect(queryByText(/11954/)).toBeNull();
    expect(queryByText(/\d+\s*[–-]\s*\d+\s+OF/i)).toBeNull();
  });

  it('does not render a "of {totalPages}" page denominator', () => {
    const { queryByText } = render(<PaginationControls {...baseProps} />);
    expect(queryByText(/of\s+1087/i)).toBeNull();
    expect(queryByText(/\bof\s+\d+/i)).toBeNull();
  });

  it('still renders the bare current page + working Prev/Next', () => {
    const onNextPage = jest.fn();
    const { getByText } = render(
      <PaginationControls {...baseProps} onNextPage={onNextPage} />,
    );
    expect(getByText(/Page 1/)).toBeTruthy();
    expect(getByText('Prev')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
    fireEvent.press(getByText('Next'));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });
});
