import { LegalDocumentView } from "../components/LegalDocumentView";
import { PRIVACY_POLICY_DOCUMENT } from "../data/privacy-policy";

export function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_POLICY_DOCUMENT} />;
}
