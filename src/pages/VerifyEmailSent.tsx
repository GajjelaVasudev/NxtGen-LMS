import React from 'react';
import { Link } from 'react-router-dom';

export default function VerifyEmailSent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 bg-white rounded shadow max-w-lg">
        <h2 className="text-xl font-bold mb-2">Verify your email</h2>
        <p className="text-sm text-gray-700 mb-4">We've sent a verification link to your email address. Please click the link in that email to verify your address and automatically sign in.</p>
        <p className="text-sm text-gray-600">If you did not receive the email, check your spam folder or try signing up again.</p>
        <div className="mt-6">
          <Link to="/" className="text-blue-600 underline">Return to home</Link>
        </div>
      </div>
    </div>
  );
}
