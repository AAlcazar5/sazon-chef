// frontend/__tests__/components/ui/TypeText.test.tsx
// ROADMAP 4.0 DS4.5 + DS4.6 — Card density + TypeText.

import React from 'react';
import { render } from '@testing-library/react-native';
import TypeText from '../../../components/ui/TypeText';
import { Card, Type } from '../../../constants/tokens';

describe('DS4.5 — Card density tokens', () => {
  it('feed = 16/12, hero = 24/16, inline = 12/8', () => {
    expect(Card.density.feed).toEqual({ padding: 16, gap: 12 });
    expect(Card.density.hero).toEqual({ padding: 24, gap: 16 });
    expect(Card.density.inline).toEqual({ padding: 12, gap: 8 });
  });
});

describe('DS4.6 — TypeText helper', () => {
  it('applies the matching Type token style for kind=heading', () => {
    const { getByText } = render(<TypeText kind="heading">Hi</TypeText>);
    const node = getByText('Hi');
    const flat = (Array.isArray(node.props.style) ? node.props.style : [node.props.style]).reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | null | undefined) => ({ ...acc, ...(s ?? {}) }),
      {},
    );
    expect(flat.fontSize).toBe(Type.heading.fontSize);
    expect(flat.fontFamily).toBe(Type.heading.fontFamily);
  });

  it('applies a numberOfLines default of 1 for kind=display', () => {
    const { getByText } = render(<TypeText kind="display">Hello</TypeText>);
    expect(getByText('Hello').props.numberOfLines).toBe(1);
  });

  it('applies a numberOfLines default of 2 for kind=heading', () => {
    const { getByText } = render(<TypeText kind="heading">Hello</TypeText>);
    expect(getByText('Hello').props.numberOfLines).toBe(2);
  });

  it('leaves numberOfLines undefined for kind=body', () => {
    const { getByText } = render(<TypeText kind="body">Hello</TypeText>);
    expect(getByText('Hello').props.numberOfLines).toBeUndefined();
  });

  it('caller-supplied numberOfLines wins over the default', () => {
    const { getByText } = render(
      <TypeText kind="display" numberOfLines={3}>
        Hello
      </TypeText>,
    );
    expect(getByText('Hello').props.numberOfLines).toBe(3);
  });

  it('caller-supplied style merges on top of the kind base style', () => {
    const { getByText } = render(
      <TypeText kind="body" style={{ color: 'red' }}>
        Hi
      </TypeText>,
    );
    const node = getByText('Hi');
    const flat = (Array.isArray(node.props.style) ? node.props.style : [node.props.style]).reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | null | undefined) => ({ ...acc, ...(s ?? {}) }),
      {},
    );
    expect(flat.color).toBe('red');
    expect(flat.fontSize).toBe(Type.body.fontSize); // base preserved
  });
});
