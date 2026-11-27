import { permanentRedirect } from "next/navigation";

export default function EditProfileRedirectRoute(): never {
  permanentRedirect("/settings?tab=account");
}
