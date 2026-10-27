// Typed client for the target system's JSON API. Built on page.request, so it shares the logged-in session cookie.
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { Authorisation, Booking, Client } from '../../app/types';

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  /** Raw GET for status-code checks; no assertion on the result. */
  get(path: string, params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(path, { params });
  }

  getClients(query?: string): Promise<Client[]> {
    return this.getJson<Client[]>('/api/clients', query === undefined ? undefined : { q: query });
  }

  getClient(externalId: string): Promise<Client> {
    return this.getJson<Client>(`/api/clients/${encodeURIComponent(externalId)}`);
  }

  getAuthorisations(): Promise<Authorisation[]> {
    return this.getJson<Authorisation[]>('/api/authorisations');
  }

  getBookings(): Promise<Booking[]> {
    return this.getJson<Booking[]>('/api/bookings');
  }

  private async getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
    const response = await this.get(path, params);
    await expect(response, `GET ${path} should return a 2xx response`).toBeOK();
    return (await response.json()) as T;
  }
}
