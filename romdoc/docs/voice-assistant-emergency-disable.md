# RomDoc voice assistant emergency-disable runbook

## Objective

The RomDoc voice assistant has two independent shutdown controls:

1. the audited database master switch;
2. the server environment lock.

Both controls are checked before any future OpenAI request.

## Environment variable

```env
VOICE_ASSISTANT_EMERGENCY_DISABLED=true
```

Accepted values:

| Value | Result |
|---|---|
| `true` | Emergency lock engaged |
| `false` | Emergency lock released |
| missing | Emergency lock engaged automatically |
| any other value | Emergency lock engaged automatically |

Values are trimmed and compared without case sensitivity.

The recommended standby value is:

```env
VOICE_ASSISTANT_EMERGENCY_DISABLED=true
```

## Local development

Open:

```text
ROMDOC/romdoc/.env.local
```

Add:

```env
VOICE_ASSISTANT_EMERGENCY_DISABLED=true
```

Do not add an OpenAI API key while the voice assistant must remain on standby.

Restart the local application:

```powershell
Ctrl+C
npm run dev
```

Open:

```text
http://localhost:3000/admin/settings/ai
```

Expected result:

```text
Blocare activă explicit
Protecție activă
```

## Vercel standby configuration

In the RomDoc Vercel project, add this environment variable to every environment in which voice access must remain blocked:

```text
Name:  VOICE_ASSISTANT_EMERGENCY_DISABLED
Value: true
```

Recommended targets:

```text
Production
Preview
Development
```

After changing an environment variable, redeploy the affected deployment.

Do not create `NEXT_PUBLIC_` variants of this variable. It must remain server-only.

## Immediate emergency shutdown

Use this sequence:

1. Open `/admin/settings/ai`.
2. Turn off the database master switch.
3. Enter an audit reason.
4. Save the change.
5. Set `VOICE_ASSISTANT_EMERGENCY_DISABLED=true` in Vercel.
6. Redeploy the production application.
7. Verify `/api/voice/access`.

Expected response:

```text
503 Service Unavailable
available = false
```

Depending on which protection is evaluated first, the safe denial code may be:

```text
feature_disabled
emergency_lock_active
```

Both results mean voice access is blocked.

## Controlled future release

Do not release the environment lock merely to test the interface.

A future controlled release should use this order:

1. Keep the database master switch off.
2. Configure the server-only OpenAI key.
3. Verify usage limits and allowed roles.
4. Set the rollout state to `admin_testing`.
5. Allow only the `admin` role.
6. Set:

   ```env
   VOICE_ASSISTANT_EMERGENCY_DISABLED=false
   ```

7. Redeploy.
8. Test `/api/voice/access` using an administrator account with MFA.
9. Turn on the database master switch only after all checks pass.
10. Monitor usage and costs before any wider rollout.

## Important limitations

Changing a Vercel environment variable does not change an already-running deployment until a new deployment is created.

For the fastest operational stop, use the database master switch first. Then engage the environment lock and redeploy for an independent infrastructure-level block.

## Never expose these variables

Do not use:

```env
NEXT_PUBLIC_VOICE_ASSISTANT_EMERGENCY_DISABLED
NEXT_PUBLIC_OPENAI_API_KEY
```

Do not log the OpenAI API key.

Do not return environment-variable values from public API routes.

The admin interface may display only safe derived states such as:

```text
engaged
released
missing
invalid
```
