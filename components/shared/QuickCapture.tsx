"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StickyNote, Loader2, Check } from "lucide-react";

/** Her sayfada erişilebilir hızlı not girişi (yüzen buton + modal) */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    setSaving(false);
    setSaved(true);
    window.dispatchEvent(new CustomEvent("notes:created"));
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 700);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Hızlı not"
      >
        <StickyNote className="size-6" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hızlı Not"
        description="Aklındakini hemen yaz, sonra düzenlersin."
      >
        <form onSubmit={save} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bir fikir, hatırlatma, alıntı..."
            rows={5}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={saving || saved}>
            {saving && <Loader2 className="animate-spin" />}
            {saved && <Check className="size-4" />}
            {saved ? "Kaydedildi" : "Kaydet"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
