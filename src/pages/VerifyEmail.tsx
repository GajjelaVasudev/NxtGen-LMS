import React from 'react';
import { Link } from 'react-router-dom';

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 bg-white rounded shadow max-w-lg">
        <h2 className="text-xl font-bold mb-2">Email verification removed</h2>
        <p className="text-sm text-gray-700 mb-4">This application no longer requires email verification for signup. If you just registered, please sign in using the login page.</p>
        <div className="mt-6">
          <Link to="/login" className="text-blue-600 underline">Go to Login</Link>
        </div>
      </div>
    </div>
  );
}
