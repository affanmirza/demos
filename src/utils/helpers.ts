export function sanitizePhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const cleanPhone = sanitizePhoneNumber(phone);
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 