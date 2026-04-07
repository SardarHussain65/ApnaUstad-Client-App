import { Redirect } from 'expo-router';

export default function Index() {
  // Start with the animated splash screen
  return <Redirect href="/splash" />;
}
