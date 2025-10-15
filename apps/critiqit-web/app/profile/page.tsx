import { redirect } from "next/navigation";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/get-current-user";

const ProfilePage = async () => {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const username = user.username;
  const email = user.email;
  const fullName = user.full_name ?? "Not Set";
  const avatarAlt = username
    ? `${username}'s profile image`
    : "User profile image";

  return (
    <section className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-10 rounded-lg border border-border bg-background p-8 shadow-sm">
        <header className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-40 w-40 shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} alt={avatarAlt} />
            </Avatar>
            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold">
                <span className="text-2xl font-light text-muted-foreground">
                  @
                </span>
                {username}
              </h1>
            </div>
          </div>
        </header>

        <section className="grid gap-6 rounded-lg border border-border/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <Button>Edit</Button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Username
              </dt>
              <dd className="text-sm font-medium">@{username}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm font-medium">{email}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Full name
              </dt>
              <dd className="text-sm font-medium">{fullName}</dd>
            </div>
          </dl>
        </section>

        <div className="flex justify-end">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
