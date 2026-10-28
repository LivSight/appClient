import { Redirect } from "expo-router";
import LoadingState from "@/components/LoadingState";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState fullScreen />;
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
}
