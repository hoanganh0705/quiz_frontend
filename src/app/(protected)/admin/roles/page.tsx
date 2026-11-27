import { permanentRedirect } from "next/navigation";

export default function AdminRolesRedirectPage(): never {
  permanentRedirect("/admin/users/roles");
}
