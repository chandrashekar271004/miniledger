import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { StatusBar } from "expo-status-bar";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

type Entry = {
  id: number; friendName: string; amount: number; dueDate: string;
  repaidAt: string | null; overdue?: boolean;
};
type Summary = { totalLent: number; totalRepaid: number; overdueAmount: number };

async function api(path: string, token: string | null, body?: unknown, method?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalLent: 0, totalRepaid: 0, overdueAmount: 0 });
  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [loanData, summaryData] = await Promise.all([
      api("/loans", token), api("/summary", token)
    ]);
    setEntries(loanData.entries);
    setSummary(summaryData);
  }, [token]);

  useEffect(() => {
    if (token) refresh().catch(e => Alert.alert("Could not load data", e.message));
  }, [token, refresh]);

  async function requestOtp() {
    const cleaned = phone.trim().replace(/[()\s-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      Alert.alert("Check phone number", "Use international format, e.g. +919876543210.");
      return;
    }
    try {
      setLoading(true);
      await api("/auth/request-otp", null, { phone: cleaned });
      setPhone(cleaned);
      setOtpRequested(true);
      Alert.alert("OTP requested", "Check the terminal running the MiniLedger backend.");
    } catch (e: any) { Alert.alert("Login error", e.message); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) return Alert.alert("Invalid OTP", "Enter the 6-digit OTP from the backend log.");
    try {
      setLoading(true);
      const data = await api("/auth/verify-otp", null, { phone: phone.trim(), otp });
      setToken(data.token);
    } catch (e: any) { Alert.alert("Login error", e.message); }
    finally { setLoading(false); }
  }

  async function addEntry() {
    const parsedAmount = Number(amount);
    if (!friendName.trim()) return Alert.alert("Missing name", "Enter your friend's name.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || Math.round(parsedAmount * 100) !== parsedAmount * 100) {
      return Alert.alert("Invalid amount", "Enter an amount greater than zero with up to 2 decimal places.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || new Date(`${dueDate}T00:00:00Z`).toISOString?.().slice(0, 10) !== dueDate) {
      return Alert.alert("Invalid date", "Use a real date in YYYY-MM-DD format.");
    }
    try {
      setLoading(true);
      await api("/loans", token, { friendName, amount: parsedAmount, dueDate });
      setFriendName(""); setAmount(""); setDueDate("");
      await refresh();
    } catch (e: any) { Alert.alert("Could not add entry", e.message); }
    finally { setLoading(false); }
  }

  async function markRepaid(id: number) {
    try {
      await api(`/loans/${id}/repay`, token, undefined, "PATCH");
      await refresh();
    } catch (e: any) { Alert.alert("Could not update entry", e.message); }
  }

  const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Text style={styles.logo}>MiniLedger</Text>
          <Text style={styles.subtitle}>Keep track. Stay friends.</Text>
          <View style={styles.panel}>
            <Text style={styles.heading}>{otpRequested ? "Enter your OTP" : "Sign in with phone"}</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="+919876543210" keyboardType="phone-pad" editable={!otpRequested} />
            {otpRequested && <TextInput style={styles.input} value={otp} onChangeText={setOtp}
              placeholder="6-digit OTP" keyboardType="number-pad" maxLength={6} />}
            <TouchableOpacity style={styles.button} onPress={otpRequested ? verifyOtp : requestOtp} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Please wait..." : otpRequested ? "Verify OTP" : "Request OTP"}</Text>
            </TouchableOpacity>
            {otpRequested && <TouchableOpacity onPress={() => { setOtpRequested(false); setOtp(""); }}>
              <Text style={styles.link}>Change phone number</Text>
            </TouchableOpacity>}
          </View>
          <Text style={styles.hint}>Demo login: OTP is printed in the backend terminal.</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.logoSmall}>MiniLedger</Text><Text style={styles.subtitle}>Your lending overview</Text></View>
          <TouchableOpacity onPress={() => { setToken(null); setOtp(""); setOtpRequested(false); }}>
            <Text style={styles.link}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL LENT</Text>
          <Text style={styles.total}>{money(summary.totalLent)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}><Text style={styles.statLabel}>Repaid</Text><Text style={styles.statValue}>{money(summary.totalRepaid)}</Text></View>
            <View style={styles.summaryStat}><Text style={styles.statLabel}>Overdue</Text><Text style={[styles.statValue, { color: "#B42318" }]}>{money(summary.overdueAmount)}</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Add an entry</Text>
        <View style={styles.panel}>
          <TextInput style={styles.input} value={friendName} onChangeText={setFriendName} placeholder="Friend's name" maxLength={100} />
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount (₹)" keyboardType="decimal-pad" />
          <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="Due date (YYYY-MM-DD)" />
          <TouchableOpacity style={styles.button} onPress={addEntry} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Saving..." : "Add loan"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your entries ({entries.length})</Text>
        {entries.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>No entries yet. Add a loan above to get started.</Text></View> :
          <FlatList data={entries} scrollEnabled={false} keyExtractor={item => String(item.id)}
            renderItem={({ item }) => {
              const overdue = Boolean(item.overdue) || (!item.repaidAt && item.dueDate < new Date().toISOString().slice(0, 10));
              return <View style={[styles.entry, overdue && styles.entryOverdue]}>
                <View style={styles.entryTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friend}>{item.friendName}</Text>
                    <Text style={styles.due}>Due {item.dueDate}</Text>
                  </View>
                  <Text style={styles.entryAmount}>{money(item.amount)}</Text>
                </View>
                <View style={styles.entryBottom}>
                  <Text style={[styles.status, overdue && styles.statusOverdue, item.repaidAt && styles.statusRepaid]}>
                    {item.repaidAt ? "REPAID" : overdue ? "OVERDUE" : "OUTSTANDING"}
                  </Text>
                  {!item.repaidAt && <TouchableOpacity onPress={() => markRepaid(item.id)}><Text style={styles.link}>Mark repaid</Text></TouchableOpacity>}
                </View>
              </View>;
            }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  content: { padding: 20, paddingBottom: 48 },
  logo: { fontSize: 34, fontWeight: "800", color: "#172554", textAlign: "center" },
  logoSmall: { fontSize: 28, fontWeight: "800", color: "#172554" },
  subtitle: { color: "#64748B", marginTop: 5, fontSize: 14 },
  panel: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 18, marginTop: 18, borderWidth: 1, borderColor: "#E5EAF2" },
  heading: { fontSize: 20, fontWeight: "700", color: "#172554", marginBottom: 12 },
  input: { backgroundColor: "#F8FAFC", borderColor: "#D9E1EC", borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, marginBottom: 11, color: "#0F172A" },
  button: { backgroundColor: "#3346A8", borderRadius: 11, alignItems: "center", paddingVertical: 14, marginTop: 2 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  hint: { textAlign: "center", color: "#64748B", marginTop: 18, fontSize: 12 },
  link: { color: "#3346A8", fontWeight: "700", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  summaryCard: { backgroundColor: "#172554", padding: 20, borderRadius: 20, marginBottom: 25 },
  summaryLabel: { color: "#C7D2FE", fontSize: 12, fontWeight: "700", letterSpacing: 1.3 },
  total: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", marginTop: 7 },
  summaryRow: { flexDirection: "row", marginTop: 22, borderTopWidth: 1, borderTopColor: "#394A78", paddingTop: 16 },
  summaryStat: { flex: 1 },
  statLabel: { color: "#C7D2FE", fontSize: 13 },
  statValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginTop: 4 },
  sectionTitle: { color: "#172554", fontSize: 19, fontWeight: "800", marginTop: 5, marginBottom: 5 },
  entry: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 15, borderWidth: 1, borderColor: "#E5EAF2", marginTop: 10 },
  entryOverdue: { borderColor: "#FCA5A5", backgroundColor: "#FFF7F7" },
  entryTop: { flexDirection: "row", alignItems: "center" },
  friend: { fontSize: 17, fontWeight: "700", color: "#172554" },
  due: { color: "#64748B", marginTop: 4, fontSize: 13 },
  entryAmount: { fontSize: 17, fontWeight: "800", color: "#172554" },
  entryBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  status: { color: "#475569", backgroundColor: "#F1F5F9", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, fontSize: 10, fontWeight: "800" },
  statusOverdue: { color: "#B42318", backgroundColor: "#FEE2E2" },
  statusRepaid: { color: "#067647", backgroundColor: "#D1FAE5" },
  empty: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 15, marginTop: 10 },
  emptyText: { color: "#64748B", lineHeight: 21 }
});
