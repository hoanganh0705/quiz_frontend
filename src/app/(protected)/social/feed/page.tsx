import { permanentRedirect } from "next/navigation";

export default function SocialFeedRedirectRoute(): never {
  permanentRedirect("/social");
}
