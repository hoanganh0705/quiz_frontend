

import axios, { AxiosInstance } from 'axios';

import { unwrapEnvelope, isEnvelopeResult, isNullResult } from './unwrap';

function unwrapResponseData(payload: unknown): unknown {
const result = unwrapEnvelope(payload);
if (isEnvelopeResult(result)) return result.value;
if (isNullResult(result)) return null;
return result.value;
}

const API_BASE_URL =
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const authOnlyInstance: AxiosInstance = axios.create({
baseURL: API_BASE_URL,
withCredentials: true,
timeout: 10000,
headers: {
'Content-Type': 'application/json',
  },
});

authOnlyInstance.interceptors.response.use((response) => {
response.data = unwrapResponseData(response.data);
return response;
});
