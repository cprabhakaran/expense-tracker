import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Button, Card, Field, Message } from './ui';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Asks for sign-in when the app uses Supabase, so each person only sees their own expenses.
 * Sign-in is a six-digit code sent by email, which works the same on web and mobile.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase || session) return <>{children}</>;
  if (session === undefined) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  return <SignIn />;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error: { message: string } | null }>, onDone?: () => void) {
    setBusy(true);
    setError(null);
    const { error } = await action();
    setBusy(false);
    if (error) setError(error.message);
    else onDone?.();
  }

  return (
    <ThemedView style={styles.center}>
      <View style={styles.box}>
        <ThemedText type="subtitle">Expense Tracker</ThemedText>
        <Card>
          {!sent ? (
            <>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Button
                label="Email me a sign-in code"
                busy={busy}
                disabled={!email.includes('@')}
                onPress={() => run(() => supabase!.auth.signInWithOtp({ email: email.trim() }), () => setSent(true))}
              />
            </>
          ) : (
            <>
              <Message text={`We sent a code to ${email}.`} />
              <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
              <Button
                label="Sign in"
                busy={busy}
                disabled={code.trim().length < 6}
                onPress={() => run(() => supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' }))}
              />
              <Button label="Use a different email" variant="secondary" onPress={() => setSent(false)} />
            </>
          )}
          {error ? <Message text={error} tone="error" /> : null}
        </Card>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  box: { width: '100%', maxWidth: MaxContentWidth / 2, gap: Spacing.three },
});
