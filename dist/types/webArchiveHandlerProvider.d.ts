import { SetupWorkerApi } from 'msw/lib/types/setupWorker/setupWorker';
import { ServerDefinitionOptions } from './serverHandler';
/**
 * Sets the request handlers for the given server based on the request-response pairs described
 * in the given Webarchive file (.har)
 *
 * @param serverInstance  the instance of the msw server
 * @param definitions     the contents of the WebArchive file (.har)
 * @param options         the options
 */
export declare function setRequestHandlersByWebarchive(serverInstance: SetupWorkerApi, definitions: Record<string, any>, options?: ServerDefinitionOptions): void;
