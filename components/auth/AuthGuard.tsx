'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        // Redirect to login if not on a public route and not authenticated
        router.push('/login');
      } else if (user && isPublicRoute) {
        // Redirect to home if authenticated and on a public route
        router.push('/');
      }
    }
  }, [user, loading, router, isPublicRoute]);

  // Don't protect public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated and not on a public route, don't render children
  // The useEffect will handle the redirect
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
