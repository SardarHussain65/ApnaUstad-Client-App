import { Redirect } from 'expo-router';

export default function Index() {
  // For now, we redirect to the signup screen by default.
  // In a real app, you would check if the user is authenticated here.
  return <Redirect href="/(auth)/signup" />;
}
