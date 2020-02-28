export interface Options {
  cacheId?: string;
  salt?: string;
  maxAge?: number;
  force?: boolean;
  astBody?: boolean;
  noBody?: boolean;
  serialize?: (val?: any) => string;
  deserialize?: (val?: string) => any;
}

export type MemoizeOptions = Options & { cachePath: string };
export type FnToMemoize = (...args: any[]) => any;

export interface Memoizer {
  fn: (fnToMemoize: FunctionToMemoize, options?: Options) => Promise<FunctionToMemoize>;
  invalidate: (id?: string) => Promise<any>;
  getCacheFilePath: (fnToMemoize: FunctionToMemoize, options: Options) => string;
}

declare function memoizeFs(options: MemoizeOptions): Memoizer;

export = memoizeFs;
