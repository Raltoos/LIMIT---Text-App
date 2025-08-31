import React, { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const [limit, setLimit] = useState(150);

  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [justHitLimit, setJustHitLimit] = useState(false);

  const textareaRef = useRef(null);

  const countWords = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const words = useMemo(() => countWords(value), [value]);
  const pct = Math.min(100, Math.round((words / Math.max(1, limit)) * 100));

  const triggerLimitFeedback = () => {
    setJustHitLimit(true);
    setShake(true);
    // shake ends
    setTimeout(() => setShake(false), 500);
    // "just hit" glow ends
    setTimeout(() => setJustHitLimit(false), 1000);
  };

  const projectWordCount = (currentText, insertion, selStart, selEnd) => {
    const nextText =
      currentText.slice(0, selStart) + insertion + currentText.slice(selEnd);
    return countWords(nextText);
  };

  const isDeletionInputType = (type) =>
    [
      "deleteContentBackward",
      "deleteContentForward",
      "deleteByCut",
      "deleteByDrag",
      "historyUndo",
    ].includes(type);

  const onBeforeInput = (e) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Always allow deletions
    if (isDeletionInputType(e.inputType)) return;

    const data = e.data ?? "";
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;

    const projected = projectWordCount(value, data, selStart, selEnd);

    if (projected > limit) {
      e.preventDefault();
      triggerLimitFeedback();
    }
  };

  // Trim on paste if needed (and block if the paste would exceed)
  const onPaste = (e) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (!text) return;

    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const projected = projectWordCount(value, text, selStart, selEnd);

    if (projected <= limit) return; // fine

    e.preventDefault();

    // We need to find how many words we can still insert
    const remaining = Math.max(
      0,
      limit - (words - countWords(value.slice(selStart, selEnd)))
    );
    if (remaining <= 0) {
      triggerLimitFeedback();
      return;
    }

    // Build a truncated paste that fits
    const pasteWords = text.trim().split(/\s+/).filter(Boolean);
    const truncated = pasteWords.slice(0, remaining).join(" ");
    const next = value.slice(0, selStart) + truncated + value.slice(selEnd);
    setValue(next);
    triggerLimitFeedback();
  };

  const onChange = (e) => {
    const next = e.target.value;
    if (countWords(next) > limit) {
      // trim to first `limit` words
      const trimmed = next.trim().split(/\s+/).slice(0, limit).join(" ");
      setValue(trimmed);
      triggerLimitFeedback();
    } else {
      setValue(next);
    }
  };

  const onChangeLimit = (v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && n <= 10000) {
      setLimit(Math.floor(n));
      if (countWords(value) > n) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900 antialiased flex items-center justify-center p-4 md:p-8">
      {/* Local styles for the shake + glow without needing Tailwind config */}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35); }
          100% { box-shadow: 0 0 0 16px rgba(244, 63, 94, 0); }
        }
        .pulse-glow { animation: pulseGlow 0.9s ease-out; }
      `}</style>

      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              <span className="text-pink-400 mr-2">KHUSHA</span>Editor
            </h1>
            <p className="text-sm text-zinc-500">
              Type freely until you hit your limit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="limit"
              className="text-sm text-zinc-600 whitespace-nowrap"
            >
              Word limit
            </label>
            <input
              id="limit"
              type="number"
              min={1}
              max={10000}
              value={limit}
              onChange={(e) => onChangeLimit(e.target.value)}
              className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{words}</span> / {limit} words
            </div>
            <div
              className={`text-xs ${
                words >= limit ? "text-rose-600" : "text-zinc-500"
              }`}
              aria-live="polite"
            >
              {words >= limit ? "Limit reached" : `${limit - words} remaining`}
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className={`h-full transition-all duration-300 ${
                words < limit
                  ? "bg-gradient-to-r from-indigo-500 to-blue-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Editor */}
        <div
          className={[
            "rounded-2xl border bg-white/90 backdrop-blur shadow-lg transition-all duration-300",
            "px-0",
            words >= limit ? "border-rose-300" : "border-zinc-200",
            shake ? "animate-shake" : "",
            justHitLimit ? "pulse-glow" : "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100">
            <div className="flex items-center gap-2 text-zinc-500">
              {words >= limit ? (
                <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              )}
            </div>
            <div className="text-xs text-zinc-400">
              {words >= limit
                ? "Editing locked (delete to continue)"
                : "Editing enabled"}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onBeforeInput={onBeforeInput}
            onPaste={onPaste}
            placeholder="Start writing…"
            spellCheck={true}
            className={[
              "w-full resize-y",
              // larger editor area, responsive but not full-page
              "min-h-[50vh] md:min-h-[55vh] lg:min-h-[58vh]",
              "px-4 py-4 outline-none",
              "bg-transparent",
              "text-[15px] leading-7",
              "placeholder:text-zinc-400",
            ].join(" ")}
            aria-label="Word-limited text editor"
          />

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-100">
            <div className="text-xs text-zinc-500">Delete to free up words.</div>
            <div
              className={[
                "text-xs font-medium",
                words >= limit ? "text-rose-600" : "text-emerald-600",
              ].join(" ")}
            >
              {words >= limit ? "Limit reached" : "Within limit"}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Counting method: words split on whitespace. 
        </p>
      </div>
    </div>
  );
}