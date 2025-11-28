import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FormInput } from '@/components/FormInput';
import { SocialLogin } from '@/components/SocialLogin';
import { supabase } from '@/utils/supabaseBrowser';

function makeSupabase() {
  return supabase;
}

export default function ForgotPassword(): JSX.Element {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const supabase = makeSupabase();
      if (!supabase) throw new Error('Missing Supabase configuration');

      const redirectTo = (import.meta.env.VITE_RESET_REDIRECT_URL as string) || (window.location.origin + '/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) console.debug('resetPasswordForEmail error', error.message);
      setStatus('If an account exists for that email, we sent a password reset link. Check your inbox.');
    } catch (err: any) {
      console.error('Forgot password error', err);
      setStatus('If an account exists for that email, we sent a password reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-1/2 px-6 md:px-16 lg:px-26 py-12 flex flex-col">
        <Logo />

        <div className="flex-1 flex items-center justify-center max-w-[512px] mx-auto w-full">
          <div className="w-full flex flex-col gap-12">
            <div className="flex flex-col gap-4">
              <Link
                to="/login"
                className="flex items-center gap-1 text-[#313131] font-poppins text-sm font-medium hover:underline w-fit"
              >
                <ChevronLeft className="w-6 h-6" />
                Back to login
              </Link>

              <div className="flex flex-col gap-4">
                <h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">
                  Forgot your password?
                </h1>
                <p className="text-[#313131] font-poppins text-base opacity-75">
                  Don't worry — happens to all of us. Enter your email below to recover your password.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-brand rounded flex items-center justify-center text-[#F3F3F3] font-poppins text-sm font-bold hover:opacity-90 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              {status && <div className="text-sm text-gray-700">{status}</div>}

              <SocialLogin />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16">
        <div className="relative w-full max-w-[616px] h-[816px]">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/cf9e080eeac308dabaa3b6e9ab8321b60b133a5e?width=1232"
            alt="Forgot password illustration"
            className="w-full h-full object-cover rounded-[30px]"
          />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-start gap-2">
            <div className="w-8 h-2.5 rounded-full bg-[#8DD3BB]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
