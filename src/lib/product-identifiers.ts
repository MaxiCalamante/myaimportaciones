export function verifiedGtin(value?: string) {
  if (!value || !/^(\d{8}|\d{12,14})$/.test(value)) return undefined;
  const digits = [...value].map(Number), check = digits.pop()!;
  const total = digits.reverse().reduce((sum, digit, i) => sum + digit * (i % 2 ? 1 : 3), 0);
  return (10 - total % 10) % 10 === check ? value : undefined;
}
