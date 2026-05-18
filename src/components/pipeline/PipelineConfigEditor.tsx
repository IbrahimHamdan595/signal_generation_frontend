"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { pipelinesApi, type Pipeline, type PipelineSource } from "@/lib/api";
import { Save, RotateCcw } from "lucide-react";

// Editable, per-strategy config form. Lives inside each PipelineCard on
// /strategies. Saves to `pipeline_config.config` (JSONB column).
//
// Donchian's fields drive its DonchianService directly via the
// pipeline_config row. ML fields (confidence/margin thresholds and
// disabled_actions) are surfaced here for visibility — at the moment the
// effective values live in checkpoints/{equities,fx}/model_config.json
// and are not yet re-read at runtime from `pipeline_config`, so editing
// them here is informational until that wiring lands.

interface DonchianConfig {
  window: number;
  k_sl:   number;
  k_tp:   number;
}

interface MlConfig {
  confidence_threshold?: number;
  margin_threshold?:     number;
  disabled_actions?:     ("BUY" | "SELL")[];
}

interface Props {
  pipeline: Pipeline;
}

export function PipelineConfigEditor({ pipeline }: Props) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, unknown>>(pipeline.config);
  const [saving, setSaving] = useState(false);

  // Re-sync the local draft if the upstream value changes (after a refetch).
  // We track the JSON-stringified upstream value so toggles inside the form
  // don't keep stomping the user's in-progress edits.
  const upstream = JSON.stringify(pipeline.config);
  useEffect(() => {
    setDraft(pipeline.config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upstream]);

  const dirty = JSON.stringify(draft) !== upstream;

  async function save() {
    setSaving(true);
    try {
      await pipelinesApi.update(pipeline.source as PipelineSource, { config: draft });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success(`${pipeline.display_name} config saved`);
    } catch {
      toast.error("Could not save config");
    } finally {
      setSaving(false);
    }
  }
  function reset() { setDraft(pipeline.config); }

  // ── Donchian form ──────────────────────────────────────────────────────
  if (pipeline.source === "rule_donchian") {
    const d: DonchianConfig = {
      window: Number(draft.window ?? 20),
      k_sl:   Number(draft.k_sl   ?? 1.5),
      k_tp:   Number(draft.k_tp   ?? 3.0),
    };
    function update<K extends keyof DonchianConfig>(k: K, v: DonchianConfig[K]) {
      setDraft((prev) => ({ ...prev, [k]: v }));
    }
    return (
      <div className="space-y-3">
        <FormRow label="Channel window (bars)" hint="20 is the canonical Turtle value">
          <input
            type="number" min={5} max={100} step={1}
            value={d.window}
            onChange={(e) => update("window", Number(e.target.value))}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Stop-loss multiplier (×ATR)" hint="1.5×ATR is the typical setting">
          <input
            type="number" min={0.5} max={3} step={0.1}
            value={d.k_sl}
            onChange={(e) => update("k_sl", Number(e.target.value))}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Take-profit multiplier (×ATR)" hint="3.0×ATR keeps the 2:1 RR ratio">
          <input
            type="number" min={1} max={5} step={0.1}
            value={d.k_tp}
            onChange={(e) => update("k_tp", Number(e.target.value))}
            className={inputCls}
          />
        </FormRow>
        <Actions dirty={dirty} saving={saving} onSave={save} onReset={reset} />
      </div>
    );
  }

  // ── ML form (equities + fx) ────────────────────────────────────────────
  const ml: MlConfig = {
    confidence_threshold: typeof draft.confidence_threshold === "number" ? draft.confidence_threshold : 0.55,
    margin_threshold:     typeof draft.margin_threshold     === "number" ? draft.margin_threshold     : 0.10,
    disabled_actions:     Array.isArray(draft.disabled_actions) ? (draft.disabled_actions as ("BUY" | "SELL")[]) : [],
  };
  function updateMl<K extends keyof MlConfig>(k: K, v: MlConfig[K]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }
  function toggleDisabledAction(a: "BUY" | "SELL") {
    const list = ml.disabled_actions ?? [];
    updateMl("disabled_actions", list.includes(a) ? list.filter((x) => x !== a) : [...list, a]);
  }
  return (
    <div className="space-y-3">
      <FormRow label="Confidence threshold" hint="Min top-class probability for a non-HOLD signal">
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={0.95} step={0.01}
            value={ml.confidence_threshold ?? 0.55}
            onChange={(e) => updateMl("confidence_threshold", Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-xs font-mono text-ink w-12 text-right">
            {(ml.confidence_threshold ?? 0).toFixed(2)}
          </span>
        </div>
      </FormRow>
      <FormRow label="Margin threshold" hint="Min gap between top-2 class probabilities">
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={0.5} step={0.01}
            value={ml.margin_threshold ?? 0.10}
            onChange={(e) => updateMl("margin_threshold", Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-xs font-mono text-ink w-12 text-right">
            {(ml.margin_threshold ?? 0).toFixed(2)}
          </span>
        </div>
      </FormRow>
      <FormRow label="Disabled actions" hint="Downgrade these to HOLD even when the model predicts them">
        <div className="flex gap-1.5">
          {(["BUY", "SELL"] as const).map((a) => {
            const off = ml.disabled_actions?.includes(a) ?? false;
            return (
              <button
                key={a}
                onClick={() => toggleDisabledAction(a)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  off
                    ? "bg-sell/10 text-sell border-sell/30"
                    : "bg-surface text-muted border-border hover:text-ink"
                }`}
                type="button"
              >
                {a} {off ? "OFF" : "ON"}
              </button>
            );
          })}
        </div>
      </FormRow>
      <p className="text-[10px] text-muted leading-relaxed">
        ML thresholds here are stored in <code className="text-ink">pipeline_config.config</code>;
        the effective per-checkpoint values still live in <code className="text-ink">model_config.json</code>.
        Edits here are informational until the inference layer is rewired
        to read from <code className="text-ink">pipeline_config</code>.
      </p>
      <Actions dirty={dirty} saving={saving} onSave={save} onReset={reset} />
    </div>
  );
}

// ── Small UI helpers ─────────────────────────────────────────────────────────

const inputCls = "w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors";

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted/70 mt-0.5">{hint}</p>}
    </div>
  );
}

function Actions({ dirty, saving, onSave, onReset }: {
  dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <Button variant="ghost" size="sm" onClick={onReset} disabled={!dirty || saving} className="px-3">
        <RotateCcw size={11} /> Reset
      </Button>
      <Button size="sm" onClick={onSave} disabled={!dirty || saving} loading={saving} className="px-4 justify-center">
        <Save size={11} /> Save
      </Button>
    </div>
  );
}
