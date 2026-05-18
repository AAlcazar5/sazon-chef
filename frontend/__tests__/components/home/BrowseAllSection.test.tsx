// W-D P2/D-4 — BrowseAllSection. Catalog browse is de-emphasized behind an
// opt-in affordance when enabled; unchanged passthrough when disabled
// (A/B-safe rollback).
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import BrowseAllSection from '../../../components/home/BrowseAllSection';

const Child = () => <Text>RECIPE GRID</Text>;

describe('BrowseAllSection', () => {
  it('disabled → renders children inline (old Today behaviour)', () => {
    const { getByText, queryByText } = render(
      <BrowseAllSection enabled={false}><Child /></BrowseAllSection>,
    );
    expect(getByText('RECIPE GRID')).toBeTruthy();
    expect(queryByText('Browse all recipes')).toBeNull();
  });

  it('enabled → grid hidden behind an opt-in affordance', () => {
    const { getByText, queryByText } = render(
      <BrowseAllSection enabled><Child /></BrowseAllSection>,
    );
    expect(queryByText('RECIPE GRID')).toBeNull(); // de-emphasized
    expect(getByText('Browse all recipes')).toBeTruthy();
  });

  it('enabled → tapping the affordance reveals the grid', () => {
    const { getByText, queryByText } = render(
      <BrowseAllSection enabled><Child /></BrowseAllSection>,
    );
    fireEvent.press(getByText('Browse all recipes'));
    expect(queryByText('RECIPE GRID')).toBeTruthy();
  });
});
