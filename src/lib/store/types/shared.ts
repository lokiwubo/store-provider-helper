// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLike = any;
export type FunctionLike<T extends AnyLike[] = AnyLike[]> = (...arg: T) => AnyLike;
export type PromiseFunctionLike = (...arg: AnyLike[]) => Promise<AnyLike>;
export type RecordKeyLike = keyof AnyLike;
export type ReadonlyUnion<T> = Readonly<T> | T;
export type Constructor<T = {}> = new (...args: AnyLike[]) => T;
export interface RecordLike {
    [ propName: RecordKeyLike ]: AnyLike;
}

export type ObjectValueUnion<T extends RecordLike> = {
    [ K in keyof T ]-?: T[ K ];
}[ keyof T ];

export type ObjectEntriesUnion<T extends RecordLike> = {
    [ K in keyof T ]-?: [ K, T[ K ] ];
}[ keyof T ];

export type MapFromTuple<T extends ReadonlyUnion<unknown[]>, K extends keyof T[ number ]> = {
    [ Item in T[ number ]as `${Item[ K ] & string}` ]: Item;
};

export type Merge<TFirst extends RecordLike, TTwo extends RecordLike> = Prettify<{
    [ Key in keyof TFirst | keyof TTwo ]: Key extends keyof TTwo
    ? TTwo[ Key ]
    : Key extends keyof TFirst
    ? TFirst[ Key ]
    : never;
}>;

export type ArrayListLike<T = AnyLike> = T[];
export type Push<Tuple extends unknown[], R> = Tuple extends [ ...infer T ] ? [ ...T, R ] : never;

export type Length<Tuple extends ArrayListLike> = Tuple[ 'length' ];
type FillArrayHelper<T extends number, U extends ArrayListLike = [], V = unknown> =
    Length<U> extends T ? U : FillArrayHelper<T, Push<U, V>, V>;

/**
 * @description 填充数组
 * @example
 * ```typescript
 * type fillArray = FillArray<5, "a">;
 * ["a", "a", "a"]
 * ```
 */
export type FillArray<T extends number, V = unknown> = FillArrayHelper<T, [], V>;
export type Sub<A extends number, B extends number> =
    FillArray<A> extends [ ...infer Res, ...FillArray<B> ] ? Length<Res> : never;

export type KeyPath<
    T extends ReadonlyUnion<RecordLike>,
    TExcludeKey extends string | number = '',
    Depth extends number = 10,
    K extends keyof T = keyof T,
> = Depth extends 0
    ? never
    : K extends TExcludeKey
    ? `${K}`
    : K extends string | number
    ? T extends AnyLike[]
    ?
    | `${K & number}`
    | `${K & number}.${KeyPath<T[ K & number ], TExcludeKey, Sub<Depth, 1>>}`
    : T[ K ] extends ReadonlyUnion<RecordLike>
    ? `${K}` | `${K}.${KeyPath<T[ K ], TExcludeKey, Sub<Depth, 1>>}`
    : `${K}`
    : never;

export type GetValueByPath<
    TRecord extends ReadonlyUnion<RecordLike>,
    TPath extends KeyPath<TRecord, AnyLike>,
> = TPath extends `${infer K}.${infer Rest}`
    ? K extends keyof TRecord
    ? Rest extends KeyPath<Prettify<TRecord[ K ]>>
    ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    GetValueByPath<Prettify<TRecord[ K ]>, Rest>
    : never
    : never
    : TPath extends keyof TRecord
    ? TRecord[ TPath ]
    : never;

type SetValueByPathHelper<TRecord, TPath, TValue> = TPath extends `${infer K}.${infer Rest}`
    ? K extends keyof TRecord
    ? Rest extends KeyPath<Prettify<TRecord[ K ]>>
    ? {
        [ P in keyof TRecord ]: P extends K
        ? SetValueByPathHelper<Prettify<TRecord[ K ]>, Rest, TValue>
        : TRecord[ P ];
    }
    : never
    : never
    : TPath extends keyof TRecord
    ? {
        [ P in keyof TRecord ]: P extends TPath ? TValue : TRecord[ P ];
    }
    : never;

export type SetValueByPath<
    TRecord extends RecordLike,
    TPath extends KeyPath<TRecord, AnyLike>,
    TValue,
> = SetValueByPathHelper<TRecord, TPath, TValue>;

export type PrimitiveTypeLike = string | number | boolean;

export type DateLike = Date | string | number;

export type Prettify<T> = {
    [ K in keyof T ]: T[ K ];
} & {};

export type Mutable<T> = {
    -readonly [ P in keyof T ]: T[ P ];
} & {};

export type DeepMutableTuple<T extends ReadonlyArray<AnyLike>> =
    T extends Readonly<[ infer IFirst, ...infer IRest ]>
    ? [ DeepMutable<IFirst>, ...DeepMutableTuple<IRest> ]
    : [];

export type DeepMutable<T> = {
    -readonly [ P in keyof T ]: T[ P ] extends ReadonlyArray<AnyLike>
    ? DeepMutableTuple<T[ P ]>
    : DeepMutable<T[ P ]>;
} & {};

export type ExcludeSubstrings<
    T extends string,
    U extends string,
> = T extends `${infer _Prefix}${U}${infer _Suffix}` ? never : T;

export type Get<
    TObject extends RecordLike,
    TKey extends keyof AnyLike,
    TDefault = never,
> = TKey extends keyof TObject ? TObject[ TKey ] : TDefault;

export type MakeRequired<T, K extends keyof T> = Prettify<Omit<T, K> & Required<Pick<T, K>>>;

export type NonFunction<T> = {
    [ K in keyof T ]: T[ K ] extends FunctionLike | PromiseFunctionLike ? never : K;
};

type UnionToInterFunction<U> = (U extends AnyLike ? (k: () => U) => void : never) extends (
    k: infer I,
) => void
    ? I
    : never;

export type UnionToTuple<T> =
    UnionToInterFunction<T> extends () => infer ReturnType
    ? [ ...UnionToTuple<Exclude<T, ReturnType>>, ReturnType ]
    : [];
export type ReturnPromise<T extends FunctionLike, TOut = ReturnType<T>> =
    TOut extends Promise<infer TOutput> ? TOutput : TOut;

export type StrictMatch<TData extends TTemplate, TTemplate> = {
    [ K in keyof TData ]: K extends keyof TTemplate ? TData[ K ] : never;
};

export type PickPartial<T extends RecordLike, K extends keyof T> = Prettify<
    {
        [ P in K ]?: T[ P ];
    } & Omit<T, K>
>;

export type Or<A extends boolean, B extends boolean> = A extends true
    ? false
    : B extends true
    ? true
    : false;

export type StoreFunctionsLike = FunctionLike | PromiseFunctionLike;
export type StoreRecordFunctionsLike = Record<RecordKeyLike, StoreFunctionsLike>;
export type StorePrimaryKeyLike = string | number;

export type AsertObject<T> = T extends RecordLike ? T : {};

export type AsertActions<TActions> =
    TActions extends Record<string, FunctionLike> ? TActions : never;

export type AsertRecordFunctionsLike<TRecord> = TRecord extends StoreRecordFunctionsLike
    ? TRecord
    : never;

export interface StoreSetState<T> {
    (partial: T, replace: true): Promise<T>;
    (partial: Partial<T>, replace?: false): Promise<T>;
    (state: (state: T) => T | void, replace?: true): Promise<T>;
}

export interface WriteListener<S extends RecordLike, V = S> {
    prev: V;
    select: (state: S) => V;
    equal: (a: V, b: V) => boolean;
    onChange: (current: V, prev: V) => void;
}

/** getters */

export type StoreGettersLike<TState = AnyLike> = Record<RecordKeyLike, (state: TState) => AnyLike>;

export type AsertStoreGetters<T> = T extends StoreGettersLike ? T : never;

export type AsertGetters<TGetters> =
    TGetters extends Record<string, FunctionLike>
    ? { [ K in keyof TGetters ]: ReturnType<TGetters[ K ]> }
    : never;

export type ContainerGetters<T extends StoreGettersLike<AnyLike>> = Prettify<{
    [ K in keyof T ]: T[ K ];
}>;

export type ExtraStoreGetter<TState, TGetters extends StoreGettersLike<TState>> = Prettify<{
    [ K in keyof TGetters ]: ReturnType<TGetters[ K ]>;
}>;

export interface SelectorType<T> {
    <V>(selector: (data: T) => V): V;
    (): T;
}
