import { LegalDocumentView } from "../components/LegalDocumentView";
import { TERMS_OF_SERVICE_DOCUMENT } from "../data/terms-of-service";

export function TermsOfServicePage() {
  return <LegalDocumentView document={TERMS_OF_SERVICE_DOCUMENT} />;
}
