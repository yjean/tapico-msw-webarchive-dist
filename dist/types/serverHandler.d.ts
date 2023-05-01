export interface ServerDefinitionOptions {
    strictQueryString?: boolean;
    useUniqueRequests?: boolean;
    resolveCrossOrigins?: (origin: string) => string;
    quiet?: boolean;
}
/**
 * @private
 * @param definition the definition
 */
export declare function getEntriesFromWebarchive(definition: Record<string, any>): any[];
/**
 * @pivate
 * Create an instance of a request handler for the given request-response pair
 *
 * @param entry   the web-archive entry
 * @param options the provider options
 */
export declare const createRequestHandler: (entry: any, options?: ServerDefinitionOptions | undefined) => any;
