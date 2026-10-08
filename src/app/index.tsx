import { Redirect } from "expo-router";

export default function Index() {
  const { user, profile, loading } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(splashShown);

  useEffect(() => {
    if (splashShown) return;
    const t = setTimeout(() => {
      splashShown = true;
      setMinTimePassed(true);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minTimePassed) return <LaunchScreen />;

  // Login is no longer part of the app flow. Keep the IT dashboard accessible
  // for the project demo while authenticated users still follow their role.
  if (!user || !profile) return <Redirect href="/(it)/it-dashboard" />;
  if (profile.role === "patient" && profile.emailVerified === false)
    return <Redirect href="/verify-email" />;
  if (profile.role === "admin") return <Redirect href="/admin-dashboard" />;
  if (profile.role === "it") return <Redirect href="/(it)/it-dashboard" />;
  return <Redirect href="/dashboard" />;
}
