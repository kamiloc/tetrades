export function getSpanishError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Correo no registrado en el sistema';
  }
  if (message.includes('Email not confirmed')) {
    return 'Correo no confirmado. Revisa tu bandeja';
  }
  if (message.includes('Too many requests')) {
    return 'Demasiados intentos. Espera un momento';
  }
  if (message.includes('User not found')) {
    return 'No encontramos una cuenta con ese correo';
  }
  if (message.includes('Email rate limit exceeded')) {
    return 'Limite de envios alcanzado. Intenta mas tarde';
  }
  if (
    message.includes('Token has expired') ||
    message.includes('token is invalid')
  ) {
    return 'El codigo expiro. Solicita uno nuevo';
  }
  return 'Ocurrio un error. Por favor intenta de nuevo';
}
