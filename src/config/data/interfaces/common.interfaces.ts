/**
 * Generic wrapper for keyed data sets.
 * Enables data-driven testing: Object.entries(dataSet) gives [name, data] pairs.
 */
export type DataSet<T> = Record<string, T>;
