import PlatformOperatorSecurityPage from "@/components/security/platform-operator-security-page";

export default function AdminSecurityPage() {
  return (
    <PlatformOperatorSecurityPage
      role="admin"
      nextPath="/admin/security"
    />
  );
}
