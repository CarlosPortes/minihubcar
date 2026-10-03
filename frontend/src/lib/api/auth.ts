import { apiClient } from './client';

export async function requestPasswordReset(email: string) {
  return apiClient<{ data: { message: string } }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  return apiClient<{ data: { message: string } }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
