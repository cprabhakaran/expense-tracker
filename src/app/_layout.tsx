import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AuthGate } from '@/components/auth-gate';
import { ExpensesProvider } from '@/lib/expenses-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <ExpensesProvider>
          <AppTabs />
        </ExpensesProvider>
      </AuthGate>
    </ThemeProvider>
  );
}
