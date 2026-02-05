import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  // Ensures a deterministic entry route for expo-router (it starts at `/`).
  console.log('🧭 [ROUTER] Index route mounted, redirecting to /splash');
  return <Redirect href="/splash" />;
}


