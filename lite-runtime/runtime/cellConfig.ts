/** Runtime and public API types for cells. */

export interface CellConfig {
  cell_id: string;
}

export interface PublicConfig {
  shared_css: string;
  cells: CellConfig[];
}

export const SLUG_NAME = 'lite_runtime';
