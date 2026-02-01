// frontend/hooks/useRecipePagination.ts
// Hook for managing recipe pagination state

import { useState, useMemo, useCallback } from 'react';

export interface PaginationInfo {
  /** Total number of pages */
  totalPages: number;
  /** Whether there are multiple pages */
  hasMultiplePages: boolean;
  /** Whether current page is the first page */
  isFirstPage: boolean;
  /** Whether current page is the last page */
  isLastPage: boolean;
  /** Total number of recipes */
  totalRecipes: number;
}

export interface UseRecipePaginationReturn {
  /** Current page number (0-indexed) */
  currentPage: number;
  /** Total number of recipes across all pages */
  totalRecipes: number;
  /** Whether pagination is loading */
  paginationLoading: boolean;
  /** Pagination info (calculated) */
  paginationInfo: PaginationInfo;
  /** Set current page */
  setCurrentPage: (page: number) => void;
  /** Set total recipes */
  setTotalRecipes: (total: number) => void;
  /** Set pagination loading state */
  setPaginationLoading: (loading: boolean) => void;
  /** Navigate to previous page */
  goToPreviousPage: () => void;
  /** Navigate to next page */
  goToNextPage: () => void;
  /** Navigate to specific page */
  goToPage: (page: number) => void;
  /** Reset to first page */
  resetToFirstPage: () => void;
}

export interface UseRecipePaginationOptions {
  /** Number of recipes per page */
  recipesPerPage: number;
  /** Callback when page changes (for fetching data) */
  onPageChange?: (page: number) => void;
}

/**
 * Hook for managing recipe pagination state
 * Handles page navigation and pagination calculations
 */
export function useRecipePagination({
  recipesPerPage,
  onPageChange,
}: UseRecipePaginationOptions): UseRecipePaginationReturn {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [paginationLoading, setPaginationLoading] = useState(false);

  // Calculate pagination info
  const paginationInfo = useMemo<PaginationInfo>(() => {
    const totalPages = Math.max(1, Math.ceil(totalRecipes / recipesPerPage));
    const hasMultiplePages = totalRecipes > recipesPerPage;
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;

    return {
      totalPages,
      hasMultiplePages,
      isFirstPage,
      isLastPage,
      totalRecipes,
    };
  }, [totalRecipes, recipesPerPage, currentPage]);

  // Navigate to previous page
  const goToPreviousPage = useCallback(() => {
    if (!paginationInfo.isFirstPage && !paginationLoading) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  }, [currentPage, paginationInfo.isFirstPage, paginationLoading, onPageChange]);

  // Navigate to next page
  const goToNextPage = useCallback(() => {
    if (!paginationInfo.isLastPage && !paginationLoading) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  }, [currentPage, paginationInfo.isLastPage, paginationLoading, onPageChange]);

  // Navigate to specific page
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < paginationInfo.totalPages && !paginationLoading) {
      setCurrentPage(page);
      onPageChange?.(page);
    }
  }, [paginationInfo.totalPages, paginationLoading, onPageChange]);

  // Reset to first page
  const resetToFirstPage = useCallback(() => {
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  }, [currentPage]);

  return {
    currentPage,
    totalRecipes,
    paginationLoading,
    paginationInfo,
    setCurrentPage,
    setTotalRecipes,
    setPaginationLoading,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    resetToFirstPage,
  };
}

export default useRecipePagination;
