export function formatNric(value: string): string {
  // Keep digits only and limit to the 12-digit NRIC.
  const digits = value.replace(/\D/g, '').slice(0, 12);

  if (digits.length <= 6) return digits;
  if (digits.length <= 8) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}