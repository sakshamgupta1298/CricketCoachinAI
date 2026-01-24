# Forgot Password Feature Setup Guide

This document explains how to set up and use the forgot password feature with SMTP2GO email integration.

## Overview

The forgot password feature allows users to reset their password through email verification using OTP (One-Time Password). The flow consists of:

1. **Forgot Password Screen**: User enters their registered email
2. **OTP Verification Screen**: User enters the 6-digit OTP sent to their email
3. **Reset Password Screen**: User sets a new password

## Backend Setup

### 1. SMTP2GO Configuration

The backend uses SMTP2GO SMTP server to send emails. The default configuration is already set, but you can override it with environment variables:

**Default Configuration (already set in code):**
- SMTP Host: `mail.smtp2go.com`
- SMTP Port: `2525`
- SMTP User: `elevateai.co.in`
- SMTP Password: `2btuslti469KsVv7`
- From Email: `CrickCoach AI <noreply@crickcoachai.com>`

**Optional: Override with Environment Variables**

If you need to change the configuration, you can set these environment variables:

```bash
export SMTP_HOST="mail.smtp2go.com"
export SMTP_PORT="2525"
export SMTP_USER="elevateai.co.in"
export SMTP_PASSWORD="your-password"
export FROM_EMAIL="CrickCoach AI <noreply@crickcoachai.com>"
```

### 2. Environment Variables (Optional)

If you want to override the defaults, add these to your `.env` file or set them in your deployment environment:

```env
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=elevateai.co.in
SMTP_PASSWORD=your-password-here
FROM_EMAIL=CrickCoach AI <noreply@crickcoachai.com>
```

**Note:** The default configuration is already set in the code, so you don't need to configure anything unless you want to change it.

## Backend Endpoints

### POST `/api/auth/forgot-password`

Sends an OTP to the user's registered email address.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP has been sent to your email address"
}
```

### POST `/api/auth/verify-otp`

Verifies the OTP entered by the user.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### POST `/api/auth/reset-password`

Resets the user's password after OTP verification.

**Request:**
```json
{
  "email": "user@example.com",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## OTP Configuration

- **OTP Length**: 6 digits
- **OTP Expiration**: 10 minutes
- **OTP Storage**: In-memory (cleared on server restart)

## Frontend Flow

1. User clicks "Forgot Password?" on the login screen
2. User enters their email address
3. System sends OTP to email via SMTP2GO
4. User enters the 6-digit OTP
5. System verifies OTP
6. User enters new password
7. Password is reset and user can login

## Security Features

- OTPs expire after 10 minutes
- OTPs are single-use (marked as verified after use)
- Email enumeration protection (doesn't reveal if email exists)
- Password validation (minimum 6 characters)
- OTPs are stored in-memory (not persisted)

## Testing

### Test the Flow

1. Start the backend server
2. Ensure SMTP2GO credentials are configured
3. Navigate to login screen
4. Click "Forgot Password?"
5. Enter a registered email address
6. Check email for OTP
7. Enter OTP in verification screen
8. Set new password
9. Login with new password

### Troubleshooting

**Email not sending:**
- Check SMTP credentials are correct (host, port, user, password)
- Verify SMTP connection is not blocked by firewall
- Check backend logs for SMTP error messages
- Ensure SMTP2GO account has sufficient credits
- Verify the FROM_EMAIL format is correct

**OTP not working:**
- Check if OTP has expired (10 minutes)
- Verify OTP was entered correctly
- Check backend logs for verification errors
- Ensure OTP was verified before resetting password

**Password reset fails:**
- Ensure OTP was verified first
- Check password meets requirements (min 6 characters)
- Verify email matches the one used for OTP

## Notes

- OTPs are stored in-memory and will be lost on server restart
- For production, consider using Redis or database for OTP storage
- SMTP2GO free tier has sending limits
- Consider rate limiting for forgot password requests

