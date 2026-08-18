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
     * prehensionsFrom, one call → JSON array of {slug, subject, object} for every
     * un-occluded prehension FROM `event` co-prehending `quality`, as of a moment.
     * The outward half of an axis read: "what does this prehend along q-contains?"
     */
    qualityObjectsFrom(event: string, quality: string, as_of?: number | null): string;
    /**
     * qualitySubjectsOnto, one call → JSON array of slugs. The inward half: "what
     * prehends this along q-after?" Already occlusion-filtered in scher-core.
     */
    qualitySubjectsOnto(row: string, quality: string, as_of?: number | null): string;
    /**
     * reachesSet, one call → JSON array of every node reachable from `from` along
     * un-occluded prehensions co-prehending `quality`. One walk instead of N.
     */
    reachesSet(from: string, quality: string, as_of?: number | null): string;
    /**
     * The row itself, as JSON, or "null" — so a caller can read content/name/witnessed
     * without a second source of truth for what an event says.
     */
    rowOf(slug: string): string;
    size(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmsociety_free: (a: number, b: number) => void;
    readonly wasmsociety_bucketsOf: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsociety_has: (a: number, b: number, c: number) => number;
    readonly wasmsociety_isOccluded: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmsociety_membersOf: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsociety_new: (a: number, b: number) => [number, number, number];
    readonly wasmsociety_qualityObjectsFrom: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly wasmsociety_qualitySubjectsOnto: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly wasmsociety_reachesSet: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly wasmsociety_rowOf: (a: number, b: number, c: number) => [number, number];
    readonly wasmsociety_size: (a: number) => number;
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
