import { createMetadataKey, LogicFn, metadata, SchemaPath, validate } from "@angular/forms/signals";

export const MIN_WORDS = createMetadataKey<number>();

export function minWords(path: SchemaPath<string>, min: LogicFn<string, number>) {
    metadata(path, MIN_WORDS, min);
    
    validate(path, ctx => {
        const value = ctx.value();
        const wordCount = value.trim().split(/\s+/).length;
        const minWords = min(ctx);

        if (wordCount < minWords) {
            return {
                kind: 'minWords',
                message: `Must have at least ${minWords} words, but got ${wordCount}.`
            }
        }

        return null;        
    })
}