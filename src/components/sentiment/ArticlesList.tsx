"use client";

import type { SentimentArticleResponse } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatRelative } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface ArticlesListProps {
  articles: SentimentArticleResponse[];
}

export default function ArticlesList({ articles }: ArticlesListProps) {
  return (
    <div className="space-y-3">
      {articles.slice(0, 8).map((a) => {
        const variant =
          a.sentiment_label === "positive"
            ? "positive"
            : a.sentiment_label === "negative"
            ? "negative"
            : "neutral";
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border hover:border-border/60 transition-colors"
          >
            <Badge variant={variant} className="shrink-0 mt-0.5">
              {a.sentiment_label}
            </Badge>
            <div className="flex-1 min-w-0">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ink hover:text-accent line-clamp-2 flex items-start gap-1 transition-colors"
              >
                <span className="flex-1">{a.title}</span>
                <ExternalLink size={11} className="shrink-0 mt-0.5 text-muted" />
              </a>
              <p className="text-xs text-muted mt-0.5">
                {a.source} · {formatRelative(a.published_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
