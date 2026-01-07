/**
 * Account Page
 * 
 * Quiet, serious account management.
 * Logout button at bottom, clearly visible but not dominant.
 */

"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-white mb-2">Account</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        {/* Account Information */}
        <div className="space-y-8 mb-16">
          {/* Email */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <p className="text-white">{user?.email || 'Not signed in'}</p>
          </div>

          {/* Profile Section (Placeholder for future) */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Profile</h2>
            <p className="text-sm text-gray-400">Profile settings coming soon.</p>
          </div>

          {/* Settings Section (Placeholder for future) */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Settings</h2>
            <p className="text-sm text-gray-400">Application settings coming soon.</p>
          </div>

          {/* Membership Section (Placeholder for future) */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Membership</h2>
            <p className="text-sm text-gray-400">Membership information coming soon.</p>
          </div>
        </div>

        {/* Logout Section */}
        <div className="border-t border-gray-800 pt-8">
          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 bg-gray-900 border border-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
