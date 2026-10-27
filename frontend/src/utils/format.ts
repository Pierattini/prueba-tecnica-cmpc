const integerPrice = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const decimalPrice = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

// los precios en CLP suelen ser enteros; si traen decimales se muestran los dos (1.234,50 y no 1.234,5)
export const formatPrice = (value: number): string =>
  (Number.isInteger(value) ? integerPrice : decimalPrice).format(value);

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));
