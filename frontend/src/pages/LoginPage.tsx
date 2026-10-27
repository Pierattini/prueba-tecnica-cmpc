import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu email').email('El email no es válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  // vuelve a la pagina que se intento abrir antes de pedir login
  const from = (location.state as { from?: Location } | null)?.from;
  const target = from ? `${from.pathname}${from.search}` : '/books';

  if (user) return <Navigate to={target} replace />;

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo iniciar sesión'));
    }
  };

  return (
    <div className="login">
      <form className="login__card" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="brand brand--center">
          <span className="brand__mark" aria-hidden="true" />
          CMPC Libros
        </div>
        <h1>Iniciar sesión</h1>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label className="field__control">
            <span className="field__label">Email</span>
            <input
              type="email"
              autoComplete="username"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
          </label>
          {errors.email && (
            <span id="login-email-error" className="field__error">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="field">
          <label className="field__control">
            <span className="field__label">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
            />
          </label>
          {errors.password && (
            <span id="login-password-error" className="field__error">
              {errors.password.message}
            </span>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
