$ErrorActionPreference = "Stop"

$targets = @(
  @{
    Path = "src/components/appointments/appointment-messages.tsx"
    Loader = "loadMessages"
  },
  @{
    Path = "src/components/clinic/clinic-editing-panel.tsx"
    Loader = "loadClinics"
  },
  @{
    Path = "src/components/clinic/clinic-proposal-form.tsx"
    Loader = "loadClinics"
  },
  @{
    Path = "src/components/doctor/doctor-security-settings.tsx"
    Loader = "loadStatus"
  },
  @{
    Path = "src/components/doctor/doctor-staff-manager.tsx"
    Loader = "loadStaff"
  },
  @{
    Path = "src/components/doctor/doctor-verification-form.tsx"
    Loader = "loadVerification"
  },
  @{
    Path = "src/components/medical-folder/medical-folder-manager.tsx"
    Loader = "loadDocuments"
  },
  @{
    Path = "src/components/medical-folder/patient-medical-profile.tsx"
    Loader = "loadProfile"
  },
  @{
    Path = "src/components/patient/patient-account-settings.tsx"
    Loader = "loadStatus"
  },
  @{
    Path = "src/components/patient/patient-medical-folder.tsx"
    Loader = "loadDocuments"
  },
  @{
    Path = "src/components/staff/staff-appointments-manager.tsx"
    Loader = "loadAppointments"
  }
)

foreach ($target in $targets) {
  $relativePath = $target.Path
  $loader = $target.Loader
  $fullPath = Join-Path (Get-Location) $relativePath

  if (-not (Test-Path $fullPath)) {
    throw "File not found: $relativePath"
  }

  $content = Get-Content -Path $fullPath -Raw

  $escapedLoader = [regex]::Escape($loader)
  $pattern = "useEffect\(\(\) => \{\s*void $escapedLoader\(\);\s*(?:\/\/[^\r\n]*\s*)?\}, \[(?<dependencies>[\s\S]*?)\]\);"

  $matches = [regex]::Matches(
    $content,
    $pattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($matches.Count -ne 1) {
    throw "Expected exactly one loader effect for $loader in $relativePath, found $($matches.Count). No files after this point were changed."
  }

  $dependencies = $matches[0].Groups["dependencies"].Value.Trim()

  if (
    $relativePath -eq "src/components/doctor/doctor-verification-form.tsx" -and
    [string]::IsNullOrWhiteSpace($dependencies)
  ) {
    $dependencies = $loader
  }

  $replacement = @"
useEffect(() => {
    const timerId = window.setTimeout(() => {
      void $loader();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [$dependencies]);
"@

  $updated = [regex]::Replace(
    $content,
    $pattern,
    $replacement,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  Set-Content -Path $fullPath -Value $updated -Encoding utf8
  Write-Host "Updated: $relativePath"
}

Write-Host ""
Write-Host "Step 77C Batch 3 patch completed."
Write-Host "Run the targeted ESLint command, npm run build, and npm run lint next."
