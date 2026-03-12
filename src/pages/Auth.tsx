import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, ArrowRight, Loader2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  loginSchema,
  signupSchema,
  getPasswordStrength,
  type LoginFormData,
  type SignupFormData,
} from '@/lib/auth-schemas';

const tabVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="h-12 w-12 rounded-xl gradient-neon flex items-center justify-center neon-glow">
            <Play className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-2xl font-bold">
              Video<span className="text-primary">Flow</span>
            </span>
            <span className="font-mono-code text-xs text-muted-foreground ml-1.5">v5.0</span>
          </div>
        </motion.div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-border/50">
          {/* Tabs */}
          <div className="flex mb-6 glass rounded-xl p-1">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'login' ? 'Login' : 'Cadastro'}
              </button>
            ))}
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div key="login" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <LoginForm onSwitchTab={() => setActiveTab('signup')} />
              </motion.div>
            ) : (
              <motion.div key="signup" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <SignupForm onSwitchTab={() => setActiveTab('login')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

/* ───── LOGIN FORM ───── */
function LoginForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error('Erro ao entrar', { description: error.message });
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            className="pl-10 bg-secondary border-border"
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="pl-10 pr-10 bg-secondary border-border"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
          />
          <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
            Lembrar-me
          </Label>
        </div>
        <button type="button" className="text-xs text-primary hover:underline">
          Esqueci minha senha
        </button>
      </div>

      <Button type="submit" variant="neon" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Entrar
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <button type="button" onClick={onSwitchTab} className="text-primary hover:underline font-medium">
          Criar conta
        </button>
      </p>
    </form>
  );
}

/* ───── SIGNUP FORM ───── */
function SignupForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false },
  });

  const password = watch('password', '');
  const acceptTerms = watch('acceptTerms');
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error('Erro ao criar conta', { description: error.message });
    } else {
      toast.success('Conta criada!', {
        description: 'Verifique seu email para confirmar o cadastro.',
      });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-name"
            placeholder="Seu nome"
            className="pl-10 bg-secondary border-border"
            {...register('fullName')}
          />
        </div>
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="seu@email.com"
            className="pl-10 bg-secondary border-border"
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            className="pl-10 pr-10 bg-secondary border-border"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${strength.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${(strength.score / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{strength.label}</span>
          </div>
        )}
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirmar senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-confirm"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repita a senha"
            className="pl-10 pr-10 bg-secondary border-border"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setValue('acceptTerms', !!checked)}
          className="mt-0.5"
        />
        <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
          Aceito os{' '}
          <Link to="/terms" className="text-primary hover:underline">
            termos de uso
          </Link>
        </Label>
      </div>
      {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}

      <Button type="submit" variant="neon" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Criar conta
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <button type="button" onClick={onSwitchTab} className="text-primary hover:underline font-medium">
          Entrar
        </button>
      </p>
    </form>
  );
}

export default AuthPage;
