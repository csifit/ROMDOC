import PlatformOperatorSecurityPage from "@/components/security/platform-operator-security-page";

export default function ManagerSecurityPage() {
  return (
    <PlatformOperatorSecurityPage
      role="manager"
      nextPath="/manager-dashboard/security"
    />
  );
}
