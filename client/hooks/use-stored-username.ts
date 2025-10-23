import { useEffect, useState } from "react";

/**
 * Reads the username stored in localStorage and keeps it in sync.
 * The hook returns `undefined` while the initial value is being resolved on the client.
 */
export function useStoredUsername(): string | null | undefined {
  const [username, setUsername] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const readUsername = () => {
      try {
        setUsername(localStorage.getItem("username"));
      } catch (error) {
        console.error("Failed to read username from localStorage", error);
        setUsername(null);
      }
    };

    readUsername();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "username") {
        readUsername();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return username;
}
