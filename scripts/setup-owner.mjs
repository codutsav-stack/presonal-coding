#!/usr/bin/env node

/**
 * DevVault - Secure Server-Side Owner Provisioning Script
 * 
 * This script securely provisions or promotes the website owner account.
 * It uses the Supabase Admin API with the SUPABASE_SERVICE_ROLE_KEY.
 * The service-role key is NEVER exposed in the frontend or Git repository.
 * 
 * Usage:
 *   node scripts/setup-owner.mjs [owner_email] [owner_password]
 * 
 * Environment variables:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OWNER_EMAIL
 *   OWNER_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalIdx = trimmed.indexOf('=')
    if (equalIdx > 0) {
      const key = trimmed.slice(0, equalIdx).trim()
      let val = trimmed.slice(equalIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ownerEmail = (process.argv[2] || process.env.OWNER_EMAIL || '').trim().toLowerCase()
const ownerPassword = process.argv[3] || process.env.OWNER_PASSWORD

console.log('--- DevVault Owner Provisioning ---')

if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project') || supabaseUrl.includes('YOUR_ACTUAL_')) {
  console.error('Error: VITE_SUPABASE_URL or SUPABASE_URL must be set in .env with your real Supabase project URL.')
  process.exit(1)
}

if (!serviceRoleKey || serviceRoleKey.includes('placeholder') || serviceRoleKey.includes('your-service-role') || serviceRoleKey.includes('YOUR_ACTUAL_')) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required to provision the owner account.')
  console.error('Find it in: Supabase Dashboard -> Project Settings -> API -> Project API keys -> service_role (secret)')
  console.error('Add it to your local .env as: SUPABASE_SERVICE_ROLE_KEY=your_key')
  process.exit(1)
}

if (!ownerEmail) {
  console.error('Error: Owner email must be specified via argument or OWNER_EMAIL in .env.')
  console.error('Example: node scripts/setup-owner.mjs owner@example.com MySecurePassword123!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function run() {
  try {
    console.log(`Checking status for: ${ownerEmail}`)

    // 1. List users to find if account exists
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const existingUser = userList.users.find(u => u.email?.toLowerCase() === ownerEmail)
    let userId = existingUser?.id

    if (existingUser) {
      console.log(`User already exists (ID: ${existingUser.id}). Promoting to owner...`)
      const updateData = { email_confirm: true }
      if (ownerPassword) {
        updateData.password = ownerPassword
        console.log('Password updated successfully.')
      }
      await supabase.auth.admin.updateUserById(existingUser.id, updateData)
    } else {
      if (!ownerPassword) {
        throw new Error('An owner password is required to create a new owner account. Provide it as the second argument or via OWNER_PASSWORD.')
      }
      console.log('Creating new owner account...')
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'DevVault Owner',
        },
      })

      if (createError) {
        throw new Error(`Failed to create owner user: ${createError.message}`)
      }
      userId = created.user.id
      console.log(`Owner account created with ID: ${userId}`)
    }

    // 2. Upsert profile with role = 'owner'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: ownerEmail,
        name: 'DevVault Owner',
        role: 'owner',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      throw new Error(`Failed to set owner role in profiles table: ${profileError.message}`)
    }

    console.log(`\nSUCCESS: ${ownerEmail} is now provisioned with role 'owner'!`)
    console.log('The owner can now sign in at the website and access the protected /owner dashboard.')
  } catch (err) {
    console.error('\nProvisioning failed:', err.message)
    process.exit(1)
  }
}

run()
