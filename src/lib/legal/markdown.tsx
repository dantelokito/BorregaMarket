import type { ReactNode } from "react";

export type LegalHeading = { id: string; text: string };

type Block =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "ul"; items: string[] };

function slugify(text: string, used: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "seccion";
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
}

export function parseLegalMarkdown(source: string): { blocks: Block[]; headings: LegalHeading[] } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const headings: LegalHeading[] = [];
  const used = new Map<string, number>();
  let para: string[] = [];
  let list: string[] = [];

  function flushPara() {
    if (!para.length) return;
    blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  }
  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "ul", items: [...list] });
    list = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      const text = line.slice(3).trim();
      const id = slugify(text, used);
      headings.push({ id, text });
      blocks.push({ type: "h2", id, text });
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return { blocks, headings };
}

function inlineNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] != null) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{match[1]}</strong>);
    } else {
      nodes.push(
        <code key={`${keyPrefix}-c${i}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">
          {match[2]}
        </code>
      );
    }
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function LegalArticle({ content }: { content: string }) {
  const { blocks } = parseLegalMarkdown(content);
  return (
    <article id="legal-document" className="max-w-3xl text-base leading-7 text-slate-800">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2
              key={block.id}
              id={block.id}
              className="mt-8 scroll-mt-24 text-xl font-semibold text-slate-900"
            >
              {inlineNodes(block.text, block.id)}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={`ul-${index}`} className="mt-4 list-disc space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{inlineNodes(item, `li-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${index}`} className="mt-4">
            {inlineNodes(block.text, `p-${index}`)}
          </p>
        );
      })}
    </article>
  );
}
