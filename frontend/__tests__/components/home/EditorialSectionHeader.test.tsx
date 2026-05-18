// W-D1 — no-recipe-count law regression. EditorialSectionHeader must NEVER
// render an "N recipes" catalog count under a section title (recipes are a
// like-signal store, not a countable catalog). An explicit `subtitle` still
// shows. `count` may still be passed by callers (layout/API compat) but is
// not surfaced.

import React from 'react';
import { render } from '@testing-library/react-native';
import { EditorialSectionHeader } from '../../../components/home/EditorialSectionHeader';

describe('EditorialSectionHeader — no recipe count (W-D1)', () => {
  it('does NOT render "N recipes" even when count is passed', () => {
    const { queryByText } = render(
      <EditorialSectionHeader title="For You" count={12} isDark={false} />,
    );
    expect(queryByText(/\d+\s*recipes?/i)).toBeNull();
    expect(queryByText('12 recipes')).toBeNull();
  });

  it('count={1} does not render "1 recipe" either (singular guard)', () => {
    const { queryByText } = render(
      <EditorialSectionHeader title="Saved" count={1} isDark={false} />,
    );
    expect(queryByText(/\d+\s*recipe/i)).toBeNull();
  });

  it('still renders an explicit subtitle (non-count meta is allowed)', () => {
    const { getByText, queryByText } = render(
      <EditorialSectionHeader
        title="Tonight"
        count={9}
        subtitle="Fresh picks from your pantry"
        isDark={false}
      />,
    );
    expect(getByText('Fresh picks from your pantry')).toBeTruthy();
    expect(queryByText(/\d+\s*recipes?/i)).toBeNull(); // count still suppressed
  });
});
