"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
};

export function EmojiPicker({ onEmojiSelect, className = "" }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const emojis = [
    "👍", "👎", "❤️", "😄", "😢", "😡", "🎉", "👏", "🙏", "👌",
    "🤔", "😱", "🤓", "😎", "🤖", "💯", "🔥", "⭐", "💡", "🎯",
    "✅", "❌", "⚠️", "📝", "🔗", "📎", "🖼️", "📄", "📊", "📈"
  ];

  const filteredEmojis = emojis.filter(emoji =>
    searchTerm === "" || emoji.includes(searchTerm)
  );

  return (
    <div className={className} style={{ display: "inline-block" }}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="border border-border rounded px-2 py-1 text-sm hover:bg-accent/20"
      >
        +
      </button>

      {showPicker && (
        <div className="absolute z-20 mt-2 w-48 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg p-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-secondary mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search emojis..."
              className="flex-1 border border-input rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-4 gap-1">
            {filteredEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onEmojiSelect(emoji);
                  setShowPicker(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded border border-transparent hover:bg-accent/20 transition-colors duration-150 text-lg"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}