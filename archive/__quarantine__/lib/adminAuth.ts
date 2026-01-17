/**
 * Admin Authentication Helper
 * Checks if user has admin role
 */

import { getUser, User } from './auth';
import { redirect } from 'next/navigation';

/**
 * Check if user is admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/garden');
  }

  return user;
}

/**
 * Check if user is admin (returns null if not, doesn't redirect)
 */
export async function checkAdmin(): Promise<User | null> {
  const user = await getUser();
  
  if (!user || user.role !== 'admin') {
    return null;
  }

  return user;
}

/**
 * API middleware to check admin role
 */
export async function requireAdminAPI(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}
