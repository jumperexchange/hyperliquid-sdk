import axios, { AxiosInstance } from 'axios';
import { handleApiError } from './errors';
import { RateLimiter } from './rateLimiter';

export class HttpApi {
  private client: AxiosInstance;
  private endpoint: string;
  private rateLimiter: RateLimiter;
  private requestCache: Map<string, Promise<any>> = new Map();

  constructor(baseUrl: string, endpoint: string = '/', rateLimiter: RateLimiter) {
    this.endpoint = endpoint;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.rateLimiter = rateLimiter;
  }

  async makeRequest<T>(
    payload: any,
    weight: number = 2,
    endpoint: string = this.endpoint
  ): Promise<T> {
    try {
      const promiseCacheKey = JSON.stringify({
        endpoint,
        payload,
      });
      if (this.requestCache.has(promiseCacheKey)) {
        const response = await this.requestCache.get(promiseCacheKey);
        return response as T;
      }

      const requestPromise = (async () => {
        await this.rateLimiter.waitForToken(weight);

        const response = await this.client.post(endpoint, payload);

        // Check if response data is null or undefined before returning
        if (response.data === null || response.data === undefined) {
          throw new Error('Received null or undefined response data');
        }

        if (this.requestCache.has(promiseCacheKey)) {
          this.requestCache.delete(promiseCacheKey);
        }
        return response.data;
      })();

      if (!this.requestCache.has(promiseCacheKey)) {
        this.requestCache.set(promiseCacheKey, requestPromise);
      }
      return requestPromise;
    } catch (error) {
      handleApiError(error);
    }
  }
}
