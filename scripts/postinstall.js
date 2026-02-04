#!/usr/bin/env node

// Only run jetify on non-macOS platforms (Android builds)
// macOS/iOS builds don't need jetify
const os = require('os');
const platform = os.platform();

if (platform !== 'darwin') {
  try {
    const { execSync } = require('child_process');
    console.log('Running jetify for Android...');
    execSync('npx jetify', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Jetify failed, but continuing...', error.message);
  }
} else {
  console.log('Skipping jetify on macOS (iOS build)');
}

