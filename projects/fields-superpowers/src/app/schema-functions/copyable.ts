import { createMetadataKey, LogicFn, metadata, SchemaPath } from "@angular/forms/signals";

export const COPYABLE = createMetadataKey<boolean>();

export function copyable(path: SchemaPath<string>, when: LogicFn<string, boolean>) {
    metadata(path, COPYABLE, when);
}