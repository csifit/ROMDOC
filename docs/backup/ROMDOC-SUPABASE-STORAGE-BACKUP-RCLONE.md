# RomDoc Supabase Storage Backup with rclone

This guide covers:

1. regular backups from the current computer;
2. setup from another Windows computer;
3. verification, encryption, and safe handling.

> Supabase database backups do not contain the actual Storage file contents. Storage must be backed up separately.

## Current RomDoc Storage buckets

```text
doctor-photo-staging
doctor-profile-photos
doctor-verification-documents
patient-medical-folder
```

# Part A — Regular backup on the current computer

The rclone remote is already configured as:

```text
romdoc-supabase
```

You do not need to log in manually each time. rclone uses credentials saved locally.

## 1. Test the connection

Open PowerShell and run:

```powershell
rclone lsd "romdoc-supabase:"
```

You should see the four bucket names.

The `-1` values shown by `rclone lsd` are normal for bucket listings.

## 2. Create a dated backup folder

```powershell
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destination = "C:\RomDocBackups\Storage\$date"

New-Item -ItemType Directory -Path "$destination" -Force
```

## 3. Download all buckets

```powershell
rclone copy "romdoc-supabase:" "$destination" --progress
```

Use `copy`, not `sync`.

The local structure should resemble:

```text
C:\RomDocBackups\Storage\2026-06-29_20-15\
├── doctor-photo-staging\
├── doctor-profile-photos\
├── doctor-verification-documents\
└── patient-medical-folder\
```

## 4. Compare totals

Remote:

```powershell
rclone size "romdoc-supabase:"
```

Local:

```powershell
rclone size "$destination"
```

Compare total objects and total size.

## 5. Verify the backup

```powershell
rclone check "romdoc-supabase:" "$destination" --one-way
```

A successful result should report no differences and no errors.

## 6. Encrypt the backup

1. Right-click the dated backup folder.
2. Select **7-Zip → Add to archive**.
3. Use archive format `7z`.
4. Use encryption method `AES-256`.
5. Enter a strong password.
6. Enable **Encrypt file names**.
7. Create the archive.
8. Open it once to confirm the password is required.

Recommended archive name:

```text
romdoc-storage-2026-06-29_20-15.7z
```

Only after verifying the archive, delete the unencrypted folder:

```powershell
Remove-Item -Recurse -Force "$destination"
```

## Complete regular-backup command block

```powershell
rclone lsd "romdoc-supabase:"

$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destination = "C:\RomDocBackups\Storage\$date"

New-Item -ItemType Directory -Path "$destination" -Force

rclone copy "romdoc-supabase:" "$destination" --progress

rclone size "romdoc-supabase:"
rclone size "$destination"

rclone check "romdoc-supabase:" "$destination" --one-way
```

# Part B — Configure rclone on another Windows computer

## 1. Install rclone

```powershell
winget install Rclone.Rclone
```

Close and reopen PowerShell, then verify:

```powershell
rclone version
```

## 2. Get Supabase S3 credentials

In Supabase:

```text
Storage
→ Configuration
→ S3
```

You need:

```text
Access Key ID
Secret Access Key
Region
S3 endpoint
```

Do not use:

```text
Supabase anon key
Supabase service-role key
database password
Supabase account password
```

If the existing Secret Access Key is no longer available, create a new S3 access-key pair.

## 3. Configure rclone

Run:

```powershell
rclone config
```

Choose:

```text
n
```

Remote name:

```text
romdoc-supabase
```

Storage type:

```text
s3
```

Provider:

```text
Other
```

Environment authentication:

```text
false
```

Enter the Supabase S3:

```text
Access Key ID
Secret Access Key
```

Region:

```text
Use the exact region displayed in Supabase.
```

Endpoint:

```text
https://YOUR_PROJECT_REF.storage.supabase.co/storage/v1/s3
```

Leave `location_constraint` and `acl` empty unless Supabase explicitly provides values.

When asked:

```text
Edit advanced config?
```

choose:

```text
y
```

Find:

```text
force_path_style
```

Set it to:

```text
true
```

Leave other advanced options at their defaults, save the remote, then quit.

## 4. Test the new computer

```powershell
rclone lsd "romdoc-supabase:"
```

Expected buckets:

```text
doctor-photo-staging
doctor-profile-photos
doctor-verification-documents
patient-medical-folder
```

## 5. Run the first backup

```powershell
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destination = "C:\RomDocBackups\Storage\$date"

New-Item -ItemType Directory -Path "$destination" -Force

rclone copy "romdoc-supabase:" "$destination" --progress

rclone size "romdoc-supabase:"
rclone size "$destination"

rclone check "romdoc-supabase:" "$destination" --one-way
```

Then encrypt the backup with 7-Zip.

# Part C — Optional transfer of the existing rclone configuration

## Find the configuration file

```powershell
rclone config file
```

Typical Windows path:

```text
C:\Users\YOUR_USERNAME\AppData\Roaming\rclone\rclone.conf
```

The file contains sensitive credentials.

Never:

```text
commit it to GitHub
place it in the RomDoc repository
send it by normal email
store it unencrypted in cloud storage
share it in screenshots
```

For secure transfer:

1. place `rclone.conf` in a password-protected 7-Zip archive;
2. use AES-256;
3. enable **Encrypt file names**;
4. transfer it securely;
5. copy it to the rclone config location on the new computer;
6. delete temporary unencrypted copies.

Then test:

```powershell
rclone lsd "romdoc-supabase:"
```

Manual setup with a new Supabase S3 key is generally safer for a new permanent computer.

# Part D — Safe and unsafe commands

Safe for backups:

```powershell
rclone lsd
rclone size
rclone copy
rclone check
```

Do not use against the live Supabase remote:

```powershell
rclone sync
rclone move
rclone delete
rclone purge
```

These can modify or delete live Storage files.

# Part E — Recommended frequency

During development:

```text
Once per month
Before testing cleanup or deletion jobs
Before substantial Storage changes
```

After launch with real patient documents:

```text
Once per week
```

# Part F — Simple retention policy

```text
Keep the latest 4 weekly Storage backups
Keep 3 monthly Storage backups
```

All retained backups containing private or medical information should remain encrypted.

Keep at least one encrypted copy outside the main computer, such as:

```text
encrypted external SSD
encrypted cloud storage
```

# Troubleshooting

## rclone is not recognized

Close and reopen PowerShell, then run:

```powershell
rclone version
```

If needed:

```powershell
winget install Rclone.Rclone
```

## The remote does not exist

```powershell
rclone listremotes
```

Expected:

```text
romdoc-supabase:
```

If missing:

```powershell
rclone config
```

## Authentication fails

Check:

- Access Key ID;
- Secret Access Key;
- region;
- full endpoint;
- `force_path_style = true`.

To edit the remote:

```powershell
rclone config
```

Then choose:

```text
e
```

## Source and destination differ

```powershell
rclone check "romdoc-supabase:" "$destination" --one-way
```

Possible causes:

- files changed during backup;
- upload completed after copying began;
- interrupted transfer;
- insufficient local disk space.

Run the same `rclone copy` command again. It copies missing or changed files without deleting existing local files.

# Quick reference

## Test connection

```powershell
rclone lsd "romdoc-supabase:"
```

## Create backup

```powershell
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destination = "C:\RomDocBackups\Storage\$date"
New-Item -ItemType Directory -Path "$destination" -Force
rclone copy "romdoc-supabase:" "$destination" --progress
```

## Verify backup

```powershell
rclone size "romdoc-supabase:"
rclone size "$destination"
rclone check "romdoc-supabase:" "$destination" --one-way
```

## Find rclone configuration

```powershell
rclone config file
```

## List configured remotes

```powershell
rclone listremotes
```
