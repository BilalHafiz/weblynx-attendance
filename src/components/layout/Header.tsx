import { useEffect, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [adminName, setAdminName] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setAdminName(snap.data().name);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-24 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="ml-16 lg:ml-0">
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 cursor-pointer">
        <Avatar className="h-11 w-11 text-2xl border-primary border-2">
          <AvatarFallback>
            {adminName ? adminName.charAt(0) : "A"}
          </AvatarFallback>
        </Avatar>

        <div className="hidden md:block">
          <p className="text-xl font-medium">
            {adminName || "Loading..."}
          </p>
          <p className="text-sm text-muted-foreground">Admin</p>
        </div>
      </div>
    </header>
  );
}
