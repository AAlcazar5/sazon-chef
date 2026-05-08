// I2.4 — ReverseDiscoveryCard render tests.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ReverseDiscoveryCard,
  type ReverseDiscoveryPayload,
} from '../../../components/today/ReverseDiscoveryCard';

const fullPayload = (): ReverseDiscoveryPayload => ({
  candidate: {
    canonical: 'cassava',
    locale: 'pt-BR',
    localName: 'mandioca',
    availabilityTier: 'common',
    notes: 'Also "aipim" in S/SE Brazil; "macaxeira" in NE Brazil — same root.',
  },
  copy: {
    eyebrow: 'YOUR MARKET HAS',
    headline: 'mandioca',
    body: 'Local kitchens cook with this all the time. Want a way in?',
    cta: 'Show me how',
  },
});

describe('ReverseDiscoveryCard (I2.4)', () => {
  it('renders the full card from a populated payload', () => {
    const { getByTestId } = render(
      <ReverseDiscoveryCard payload={fullPayload()} onAsk={() => undefined} />
    );
    expect(getByTestId('reverse-discovery-card')).toBeTruthy();
    expect(getByTestId('reverse-discovery-eyebrow').props.children).toBe('YOUR MARKET HAS');
    expect(getByTestId('reverse-discovery-headline').props.children).toBe('mandioca');
    expect(getByTestId('reverse-discovery-body').props.children).toMatch(/Local kitchens/);
  });

  it('renders curator notes when present', () => {
    const { getByTestId } = render(
      <ReverseDiscoveryCard payload={fullPayload()} onAsk={() => undefined} />
    );
    expect(getByTestId('reverse-discovery-notes').props.children).toMatch(/aipim|macaxeira/);
  });

  it('omits the notes line when notes are null', () => {
    const noNotes = fullPayload();
    noNotes.candidate!.notes = null;
    const { queryByTestId } = render(
      <ReverseDiscoveryCard payload={noNotes} onAsk={() => undefined} />
    );
    expect(queryByTestId('reverse-discovery-notes')).toBeNull();
  });

  it('returns null when payload.candidate is null', () => {
    const empty: ReverseDiscoveryPayload = { candidate: null, copy: null };
    const { queryByTestId } = render(
      <ReverseDiscoveryCard payload={empty} onAsk={() => undefined} />
    );
    expect(queryByTestId('reverse-discovery-card')).toBeNull();
  });

  it('returns null when copy is null even if candidate is present', () => {
    const halfPayload: ReverseDiscoveryPayload = {
      candidate: fullPayload().candidate,
      copy: null,
    };
    const { queryByTestId } = render(
      <ReverseDiscoveryCard payload={halfPayload} onAsk={() => undefined} />
    );
    expect(queryByTestId('reverse-discovery-card')).toBeNull();
  });

  it('CTA fires onAsk with the candidate', () => {
    const onAsk = jest.fn();
    const payload = fullPayload();
    const { getByTestId } = render(
      <ReverseDiscoveryCard payload={payload} onAsk={onAsk} />
    );
    fireEvent.press(getByTestId('reverse-discovery-cta'));
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledWith(payload.candidate);
  });

  it('CTA carries an accessibility label that names the ingredient', () => {
    const { getByLabelText } = render(
      <ReverseDiscoveryCard payload={fullPayload()} onAsk={() => undefined} />
    );
    expect(getByLabelText(/Show me how — mandioca/)).toBeTruthy();
  });

  it('eyebrow has header accessibility role for screen readers', () => {
    const { getByRole } = render(
      <ReverseDiscoveryCard payload={fullPayload()} onAsk={() => undefined} />
    );
    // Header role assertion via the eyebrow text
    expect(getByRole('header').props.children).toBe('YOUR MARKET HAS');
  });
});
