/* tslint:disable */
/* eslint-disable */

/**
 * A Society held on the wasm side. Constructed ONCE from a whole batch of rows
 * (one boundary crossing); read via coarse calls that return whole structures.
 */
export class WasmSociety {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * bucketsOf, one call → the WHOLE bucket structure as JSON. This is the design
     * law: the boundary is crossed once per read, not once per member.
     */
    bucketsOf(event: string, as_of?: number | null): string;
    /**
     * countedOf — one key, fully read (value + section + provenance).
     */
    countedOf(holder: string, key: string, as_of?: number | null): string;
    /**
     * (cautionary) one slug, one crossing.
     */
    has(slug: string): boolean;
    /**
     * (cautionary) one occlusion read, one crossing.
     */
    isOccluded(target: string, as_of?: number | null): boolean;
    /**
     * membersOf, one call → JSON array of slugs.
     */
    membersOf(event: string, as_of?: number | null): string;
    /**
     * The coarse constructor: one call, a whole canon. `rows_json` is a JSON array
     * of EventRow objects (the conformance corpus's exact row spelling). Rows are
     * laid verbatim via the one write — ~q mode-beats included, no layP guards run
     * (mirrors the conformance harnesses' replay discipline).
     */
    constructor(rows_json: string);
    /**
     * readCounted — ONE call, every key this holder counts, whole structure.
     * The design law: cross the boundary once per READ, never once per key.
     */
    readCounted(holder: string, as_of: number | null | undefined, keep_empty: boolean): string;
    /**
     * sectionOf — the newest live placement, read.
     */
    sectionOf(holder: string, key: string, as_of?: number | null): string | undefined;
    size(): number;
    /**
     * valueOf — the fold alone, when that is all the caller wants.
     */
    valueOf(holder: string, key: string, as_of?: number | null): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmsociety_free: (a: number, b: number) => void;
    readonly wasmsociety_bucketsOf: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsociety_countedOf: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly wasmsociety_has: (a: number, b: number, c: number) => number;
    readonly wasmsociety_isOccluded: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmsociety_membersOf: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsociety_new: (a: number, b: number) => [number, number, number];
    readonly wasmsociety_readCounted: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly wasmsociety_sectionOf: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly wasmsociety_size: (a: number) => number;
    readonly wasmsociety_valueOf: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
