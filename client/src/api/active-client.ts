/**
 * THE swap point between the simulated and the real server.
 *
 * Every hook and the public `@/api` entry take the client from here. To
 * connect a real backend, export the HTTP implementation of `ApiClient`
 * from this file instead of the mock one.
 */

export { api } from './mock'
