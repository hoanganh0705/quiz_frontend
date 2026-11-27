import { permanentRedirect } from "next/navigation";

export default function TournamentRedirectRoute(): never {
  permanentRedirect("/tournaments");
}
