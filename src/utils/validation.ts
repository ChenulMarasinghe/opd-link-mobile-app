export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// Sri Lankan style: exactly 10 digits (for example 0771234567)
export const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

export const onlyDigits = (text: string) => text.replace(/\D/g, "");