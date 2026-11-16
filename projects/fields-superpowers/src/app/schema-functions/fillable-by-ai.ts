import { createMetadataKey, LogicFn, metadata, SchemaPath } from "@angular/forms/signals";

export const FILLABLE_BY_AI = createMetadataKey<string>();

export function fillableByAI(path: SchemaPath<string>, prompt: LogicFn<string, string>) {
    metadata(path, FILLABLE_BY_AI, prompt);
}