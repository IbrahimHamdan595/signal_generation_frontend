"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { User, Lock, Bell, Trash2, Plus } from "lucide-react";
import { usePriceAlertRules } from "@/hooks/usePriceAlerts";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // Price alert rules
  const { rules, createRule, deleteRule, creating } = usePriceAlertRules();
  const [rulesTicker, setRulesTicker] = useState("");
  const [rulesCondition, setRulesCondition] = useState<"above" | "below">("above");
  const [rulesPrice, setRulesPrice] = useState("");

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await authApi.updateProfile({ full_name: fullName, email });
      if (setUser) setUser(res.data);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success("Password changed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      toast.error("Failed to change password — check your current password");
    } finally {
      setSavingPw(false);
    }
  }

  function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(rulesPrice);
    if (!rulesTicker || isNaN(price)) return;
    createRule({ ticker: rulesTicker.toUpperCase(), condition: rulesCondition, target_price: price });
    setRulesTicker(""); setRulesPrice("");
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="mt-6 max-w-2xl space-y-5">

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <User size={14} className="text-muted" />
          </CardHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <Button type="submit" loading={savingProfile} size="sm">Save Profile</Button>
          </form>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <Lock size={14} className="text-muted" />
          </CardHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <Button type="submit" loading={savingPw} size="sm" variant="secondary">Change Password</Button>
          </form>
        </Card>

        {/* Price Alert Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Price Alert Rules</CardTitle>
            <Bell size={14} className="text-muted" />
          </CardHeader>
          <p className="text-xs text-muted mb-4">
            Get an alert when a ticker crosses a price threshold. Rules auto-deactivate after triggering.
          </p>
          <form onSubmit={handleAddRule} className="flex items-end gap-2 mb-4 flex-wrap">
            <div>
              <label className="text-xs text-muted block mb-1">Ticker</label>
              <input
                type="text"
                value={rulesTicker}
                onChange={(e) => setRulesTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-24 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/50 uppercase"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Condition</label>
              <select
                value={rulesCondition}
                onChange={(e) => setRulesCondition(e.target.value as "above" | "below")}
                className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Price ($)</label>
              <input
                type="number"
                value={rulesPrice}
                onChange={(e) => setRulesPrice(e.target.value)}
                placeholder="180.00"
                step="0.01"
                className="w-28 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/50"
              />
            </div>
            <Button type="submit" size="sm" loading={creating} disabled={!rulesTicker || !rulesPrice}>
              <Plus size={12} /> Add Rule
            </Button>
          </form>

          <div className="space-y-2">
            {rules.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No price alert rules yet</p>
            ) : (
              rules.map((r) => (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${r.is_active ? "border-border bg-surface" : "border-border/30 bg-surface/50 opacity-60"}`}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-ink">{r.ticker}</span>
                    <span className="text-muted">{r.condition}</span>
                    <span className="text-ink">${r.target_price.toFixed(2)}</span>
                    {!r.is_active && <span className="text-xs text-hold">triggered</span>}
                  </div>
                  <button
                    onClick={() => deleteRule(r.id)}
                    className="p-1 text-muted hover:text-sell transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Keyboard shortcuts reference */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-y-2 text-xs text-muted">
            {[
              ["G then D", "Dashboard"],
              ["G then S", "Signals"],
              ["G then M", "Market"],
              ["G then O", "Model"],
              ["G then W", "Watchlist"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono text-ink">{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
